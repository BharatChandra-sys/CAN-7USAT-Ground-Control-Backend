"""
FastAPI Ground Control Station - Dual Vehicle Support
CanSat (915 MHz / 10 Hz) + Rocket (868 MHz / 20 Hz)
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .config import settings
from .models import TelemetryPacket, SystemStatus, CommandRequest
from .telemetry_decoder import TelemetryDecoder
from .mock_data_generator import MockDataGenerator

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

VehicleId = Literal["cansat", "rocket"]

# ─────────────────────────────────────────────────────────────────────────────
# Per-vehicle state container
# ─────────────────────────────────────────────────────────────────────────────

class VehicleState:
    """Holds all runtime state for one vehicle (CanSat or Rocket)."""

    def __init__(
        self,
        vehicle_id: VehicleId,
        data_rate_hz: int,
        mock_profile: str,
        max_altitude: float,
        freq_mhz: float,
    ):
        self.vehicle_id = vehicle_id
        self.data_rate_hz = data_rate_hz
        self.mock_profile = mock_profile
        self.max_altitude = max_altitude
        self.freq_mhz = freq_mhz

        self.connections: List[WebSocket] = []
        self.packets_sent: int = 0
        self.decoder = TelemetryDecoder()
        self.mock_generator: MockDataGenerator | None = None
        self.telemetry_task: asyncio.Task | None = None

        self.latest_packet: TelemetryPacket | None = None
        self.packet_history: List[TelemetryPacket] = []
        self.server_start_time = datetime.utcnow()

        self.MAX_HISTORY = 20000

    # ── WebSocket helpers ────────────────────────────────────────────────────

    async def ws_connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)
        logger.info(
            "[%s] WS client connected — total: %d",
            self.vehicle_id, len(self.connections),
        )

    def ws_disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)
        logger.info(
            "[%s] WS client disconnected — total: %d",
            self.vehicle_id, len(self.connections),
        )

    async def ws_broadcast(self, message: dict):
        dead = []
        for conn in self.connections:
            try:
                await conn.send_json(message)
                self.packets_sent += 1
            except Exception as exc:
                logger.warning("[%s] broadcast error: %s", self.vehicle_id, exc)
                dead.append(conn)
        for conn in dead:
            self.connections.remove(conn)

    # ── Telemetry processing ─────────────────────────────────────────────────

    async def process_packet(self, packet_bytes: bytes):
        packet = self.decoder.decode(packet_bytes)
        if packet is None:
            logger.warning("[%s] dropped corrupted packet", self.vehicle_id)
            return

        self.latest_packet = packet
        self.packet_history.append(packet)
        if len(self.packet_history) > self.MAX_HISTORY:
            self.packet_history.pop(0)

        msg = packet.to_dict()
        msg["vehicle_id"] = self.vehicle_id
        msg["freq_mhz"] = self.freq_mhz
        await self.ws_broadcast(msg)

        if self.decoder.packets_decoded % 10 == 0:
            logger.debug(
                "[%s] #%d  state=%s  alt=%.1fm  vel=%.1fm/s",
                self.vehicle_id,
                self.decoder.packets_decoded,
                packet.flight_state.name,
                packet.altitude_m,
                packet.velocity_ms,
            )

    # ── Mock lifecycle ────────────────────────────────────────────────────────

    async def start_mock(self):
        if settings.mock_mode:
            logger.info("[%s] starting mock generator (%s Hz, profile=%s)",
                        self.vehicle_id, self.data_rate_hz, self.mock_profile)
            self.mock_generator = MockDataGenerator(
                data_rate_hz=self.data_rate_hz,
                profile=self.mock_profile,
                max_altitude_override=self.max_altitude,
            )
            self.telemetry_task = asyncio.create_task(
                self.mock_generator.start(self.process_packet)
            )

    async def stop_mock(self):
        if self.mock_generator:
            self.mock_generator.stop()
        if self.telemetry_task:
            self.telemetry_task.cancel()
            try:
                await self.telemetry_task
            except asyncio.CancelledError:
                pass
        self.mock_generator = None
        self.telemetry_task = None

    async def reset(self, profile: str | None = None):
        if not settings.mock_mode:
            raise HTTPException(status_code=400, detail="Mock mode is disabled")

        if profile:
            normalized = profile.strip().lower()
            if normalized not in {"original", "demo"}:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid profile '{profile}'. Use: original, demo",
                )
            self.mock_profile = normalized

        await self.stop_mock()

        self.latest_packet = None
        self.packet_history.clear()
        self.decoder = TelemetryDecoder()
        self.packets_sent = 0
        self.server_start_time = datetime.utcnow()

        await self.start_mock()

    # ── Status ────────────────────────────────────────────────────────────────

    def get_status(self) -> SystemStatus:
        uptime = (datetime.utcnow() - self.server_start_time).total_seconds()
        return SystemStatus(
            connected=settings.mock_mode,
            packets_received=self.decoder.packets_decoded,
            packets_dropped=self.decoder.packets_dropped,
            last_packet_time=self.latest_packet.received_at if self.latest_packet else None,
            websocket_clients=len(self.connections),
            uptime_seconds=uptime,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Instantiate both vehicles
# ─────────────────────────────────────────────────────────────────────────────

CANSAT = VehicleState(
    vehicle_id="cansat",
    data_rate_hz=10,          # 915 MHz XBee — 10 Hz
    mock_profile=os.getenv("CANSAT_MOCK_PROFILE", "demo"),
    max_altitude=162.0,       # competition apogee target
    freq_mhz=915.0,
)

ROCKET = VehicleState(
    vehicle_id="rocket",
    data_rate_hz=20,          # 868 MHz XBee — 20 Hz
    mock_profile=os.getenv("ROCKET_MOCK_PROFILE", "demo"),
    max_altitude=1000.0,      # 1 km competition target
    freq_mhz=868.0,
)

_VEHICLES: dict[str, VehicleState] = {"cansat": CANSAT, "rocket": ROCKET}

server_start_time = datetime.utcnow()


def _get_vehicle(vehicle: str) -> VehicleState:
    v = _VEHICLES.get(vehicle.lower())
    if v is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown vehicle '{vehicle}'. Use: cansat, rocket",
        )
    return v


# ─────────────────────────────────────────────────────────────────────────────
# App lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("GITAM CAN-7USAT Ground Control Station — Dual Vehicle")
    logger.info("  CanSat : 915 MHz, %d Hz, ws://.../ws/telemetry/cansat", CANSAT.data_rate_hz)
    logger.info("  Rocket : 868 MHz, %d Hz, ws://.../ws/telemetry/rocket", ROCKET.data_rate_hz)
    logger.info("=" * 60)

    await CANSAT.start_mock()
    await ROCKET.start_mock()

    yield

    logger.info("Shutting down...")
    await CANSAT.stop_mock()
    await ROCKET.stop_mock()


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GITAM CAN-7USAT Ground Control — Dual Vehicle",
    description="Dual-vehicle real-time telemetry: CanSat (915 MHz) + Rocket (868 MHz)",
    version="2.0.0",
    lifespan=lifespan,
)

static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Health / info
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return FileResponse(Path(__file__).parent.parent / "static" / "websocket_test.html")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/vehicles")
async def list_vehicles():
    """List available vehicles and their WebSocket URLs."""
    return {
        "vehicles": [
            {
                "id": "cansat",
                "name": "CAN-7USAT CanSat",
                "freq_mhz": 915.0,
                "data_rate_hz": CANSAT.data_rate_hz,
                "ws_url": "/ws/telemetry/cansat",
                "color": "#22d3ee",
            },
            {
                "id": "rocket",
                "name": "GITAM Rocket",
                "freq_mhz": 868.0,
                "data_rate_hz": ROCKET.data_rate_hz,
                "ws_url": "/ws/telemetry/rocket",
                "color": "#f97316",
            },
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Status — per-vehicle AND combined
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/status")
async def get_status(vehicle: str = "cansat"):
    """Get status for a specific vehicle. ?vehicle=cansat|rocket"""
    return _get_vehicle(vehicle).get_status()


@app.get("/api/status/all")
async def get_all_status():
    return {vid: v.get_status() for vid, v in _VEHICLES.items()}


# ─────────────────────────────────────────────────────────────────────────────
# Telemetry endpoints — per-vehicle
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/telemetry/latest")
async def get_latest(vehicle: str = "cansat"):
    v = _get_vehicle(vehicle)
    if v.latest_packet is None:
        raise HTTPException(status_code=404, detail=f"No telemetry for {vehicle}")
    msg = v.latest_packet.to_dict()
    msg["vehicle_id"] = v.vehicle_id
    return msg


@app.get("/api/telemetry/history")
async def get_history(vehicle: str = "cansat", limit: int = 100):
    v = _get_vehicle(vehicle)
    limit = min(limit, v.MAX_HISTORY)
    packets = v.packet_history[-limit:]
    return {
        "vehicle": vehicle,
        "count": len(packets),
        "packets": [p.to_dict() for p in packets],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Mock reset — per-vehicle
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/mock/reset")
async def reset_mock(vehicle: str = "cansat", profile: str | None = None):
    """Reset mock mission for a specific vehicle. ?vehicle=cansat|rocket"""
    v = _get_vehicle(vehicle)
    await v.reset(profile)
    return {
        "status": "reset",
        "vehicle": vehicle,
        "profile": v.mock_profile,
        "data_rate_hz": v.data_rate_hz,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/command")
async def send_command(command: CommandRequest, vehicle: str = "cansat"):
    v = _get_vehicle(vehicle)
    logger.info("[%s] command: %s  params: %s", v.vehicle_id, command.command, command.parameters)
    return {
        "status": "queued",
        "vehicle": vehicle,
        "command": command.command,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CSV export
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/export/csv")
async def export_csv(vehicle: str = "cansat"):
    v = _get_vehicle(vehicle)
    if not v.packet_history:
        raise HTTPException(status_code=404, detail=f"No telemetry data for {vehicle}")

    lines = [
        "timestamp_ms,flight_state,altitude_m,velocity_ms,"
        "quat_w,quat_x,quat_y,quat_z,gps_lat,gps_lon,received_at"
    ]
    for p in v.packet_history:
        lines.append(
            f"{p.timestamp_ms},{p.flight_state.value},"
            f"{p.altitude_m},{p.velocity_ms},"
            f"{p.quat_w},{p.quat_x},{p.quat_y},{p.quat_z},"
            f"{p.gps_lat},{p.gps_lon},"
            f"{p.received_at.isoformat() if p.received_at else ''}"
        )

    return JSONResponse(
        content={"csv": "\n".join(lines), "rows": len(v.packet_history)},
        headers={
            "Content-Disposition": (
                f"attachment; filename={vehicle}_telemetry_"
                f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
            )
        },
    )


@app.get("/api/decoder/stats")
async def get_decoder_stats(vehicle: str = "cansat"):
    return _get_vehicle(vehicle).decoder.get_stats()


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoints — one per vehicle
# ─────────────────────────────────────────────────────────────────────────────

async def _handle_ws(vehicle_state: VehicleState, websocket: WebSocket):
    await vehicle_state.ws_connect(websocket)
    try:
        await websocket.send_json({
            "type": "connected",
            "vehicle_id": vehicle_state.vehicle_id,
            "freq_mhz": vehicle_state.freq_mhz,
            "message": f"Connected to {vehicle_state.vehicle_id} telemetry stream",
            "mock_mode": settings.mock_mode,
            "data_rate_hz": vehicle_state.data_rate_hz,
        })

        if vehicle_state.latest_packet:
            msg = vehicle_state.latest_packet.to_dict()
            msg["vehicle_id"] = vehicle_state.vehicle_id
            msg["freq_mhz"] = vehicle_state.freq_mhz
            await websocket.send_json(msg)

        while True:
            data = await websocket.receive_text()
            logger.debug("[%s] client msg: %s", vehicle_state.vehicle_id, data)
            await websocket.send_json({"echo": data})

    except WebSocketDisconnect:
        vehicle_state.ws_disconnect(websocket)
    except Exception as exc:
        logger.error("[%s] WS error: %s", vehicle_state.vehicle_id, exc)
        vehicle_state.ws_disconnect(websocket)


@app.websocket("/ws/telemetry/cansat")
async def ws_cansat(websocket: WebSocket):
    """CanSat telemetry stream — 915 MHz / 10 Hz"""
    await _handle_ws(CANSAT, websocket)


@app.websocket("/ws/telemetry/rocket")
async def ws_rocket(websocket: WebSocket):
    """Rocket telemetry stream — 868 MHz / 20 Hz"""
    await _handle_ws(ROCKET, websocket)


# Legacy endpoint — routes to CanSat for backward compat
@app.websocket("/ws/telemetry")
async def ws_legacy(websocket: WebSocket):
    """Legacy WebSocket endpoint — routes to CanSat."""
    await _handle_ws(CANSAT, websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
    )
