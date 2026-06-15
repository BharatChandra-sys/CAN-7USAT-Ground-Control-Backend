import asyncio
import math
import logging
from datetime import datetime
from .models import TelemetryPacket, FlightState
from .telemetry_decoder import TelemetryDecoder

logger = logging.getLogger(__name__)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _smoothstep(x: float) -> float:
    x = _clamp(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


class MockDataGenerator:
    """
    Mock telemetry generator with selectable profiles.

    original:
        Preserves the repository's longer simulation-style timing.

    demo:
        Shorter UI demonstration profile. It is explicitly simulated and
        designed so operators can see BOOST, COAST, APOGEE, DESCENT, and
        LANDED without waiting two minutes.
    """

    VALID_PROFILES = {"original", "demo"}

    def __init__(
        self,
        data_rate_hz: int = 10,
        profile: str = "demo",
        max_altitude_override: float | None = None,
    ):
        self.data_rate_hz = data_rate_hz
        self.interval_sec = 1.0 / data_rate_hz

        self.profile = profile.strip().lower()
        if self.profile not in self.VALID_PROFILES:
            logger.warning("Unknown mock profile '%s'; falling back to demo", profile)
            self.profile = "demo"

        self.decoder = TelemetryDecoder()
        self.running = False
        self.start_time = None

        # GPS coordinates: Kushinagar launch site
        self.BASE_LAT = 26.74
        self.BASE_LON = 83.887

        if self.profile == "original":
            self.LIFTOFF_TIME = 0.079
            self.BURNOUT_TIME = 1.8
            self.APOGEE_TIME = 58.0
            self.APOGEE_HOLD_TIME = 1.0
            self.LANDING_TIME = 120.0
            self.BURNOUT_ALTITUDE = 80.0
            self.MAX_ALTITUDE = 162.0
            self.MAX_VELOCITY = 92.0
        else:
            self.LIFTOFF_TIME = 0.50
            self.BURNOUT_TIME = 2.20
            self.APOGEE_TIME = 11.00
            self.APOGEE_HOLD_TIME = 1.00
            self.LANDING_TIME = 35.00
            self.BURNOUT_ALTITUDE = 55.0
            self.MAX_ALTITUDE = 162.0

            # Coherent velocity so the coast reaches max altitude at apogee.
            self.MAX_VELOCITY = (
                2.0 * (self.MAX_ALTITUDE - self.BURNOUT_ALTITUDE)
                / (self.APOGEE_TIME - self.BURNOUT_TIME)
            )

        # Allow caller to override max altitude (e.g., Rocket @ 1000 m)
        if max_altitude_override is not None and max_altitude_override > 0:
            scale = max_altitude_override / self.MAX_ALTITUDE
            self.MAX_ALTITUDE = max_altitude_override
            self.BURNOUT_ALTITUDE = self.BURNOUT_ALTITUDE * scale
            self.MAX_VELOCITY = (
                2.0 * (self.MAX_ALTITUDE - self.BURNOUT_ALTITUDE)
                / (self.APOGEE_TIME - self.BURNOUT_TIME)
            )

        logger.info(
            "Mock data generator initialized at %s Hz using '%s' profile (max_alt=%.1fm)",
            data_rate_hz,
            self.profile,
            self.MAX_ALTITUDE,
        )

    async def generate_packet(self, elapsed_time: float) -> bytes:
        flight_state = self._get_flight_state(elapsed_time)
        altitude = self._calculate_altitude(elapsed_time)
        velocity = self._calculate_velocity(elapsed_time)
        quat_w, quat_x, quat_y, quat_z = self._calculate_quaternion(elapsed_time)
        gps_lat, gps_lon = self._calculate_gps(elapsed_time, altitude)

        # Simulate extended fields
        # Temperature: starts ~25°C, drops as altitude rises (lapse rate ~6.5°C/km), noise
        alt_km = altitude / 1000.0
        temperature_c = round(25.0 - alt_km * 6.5 + math.sin(elapsed_time * 0.3) * 0.8, 1)

        # Pressure: ISA model simplified (Pa)
        pressure_pa = round(101325.0 * math.exp(-altitude / 8500.0) + math.sin(elapsed_time * 0.2) * 50, 1)

        # Battery: starts 100%, drains slowly
        battery_pct = round(max(0.0, 100.0 - elapsed_time * 0.15 + math.sin(elapsed_time * 0.1) * 0.3), 1)

        # Signal strength: degrades with altitude, noise
        signal_dbm = round(-65.0 - alt_km * 4.0 + math.sin(elapsed_time * 0.5) * 2.0, 1)

        packet = TelemetryPacket(
            sync_byte=0xAA,
            timestamp_ms=int(elapsed_time * 1000),
            flight_state=flight_state,
            altitude_m=round(altitude, 2),
            velocity_ms=round(velocity, 2),
            quat_w=round(quat_w, 4),
            quat_x=round(quat_x, 4),
            quat_y=round(quat_y, 4),
            quat_z=round(quat_z, 4),
            gps_lat=round(gps_lat, 6),
            gps_lon=round(gps_lon, 6),
            checksum_xor=0,
            received_at=datetime.utcnow(),
            temperature_c=temperature_c,
            pressure_pa=pressure_pa,
            battery_pct=battery_pct,
            signal_dbm=signal_dbm,
        )

        return self.decoder.encode(packet)

    def _get_flight_state(self, t: float) -> FlightState:
        if t < self.LIFTOFF_TIME:
            return FlightState.PRE_FLIGHT
        if t < self.BURNOUT_TIME:
            return FlightState.BOOST
        if t < self.APOGEE_TIME:
            return FlightState.COAST
        if t < self.APOGEE_TIME + self.APOGEE_HOLD_TIME:
            return FlightState.APOGEE
        if t < self.LANDING_TIME:
            return FlightState.DESCENT
        return FlightState.LANDED

    def _calculate_altitude(self, t: float) -> float:
        if self.profile == "original":
            return self._calculate_original_altitude(t)

        return self._calculate_demo_altitude(t)

    def _calculate_original_altitude(self, t: float) -> float:
        if t < self.LIFTOFF_TIME:
            return 0.0

        if t < self.BURNOUT_TIME:
            progress = (t - self.LIFTOFF_TIME) / (self.BURNOUT_TIME - self.LIFTOFF_TIME)
            return 80.0 * progress ** 2

        if t < self.APOGEE_TIME:
            t_coast = t - self.BURNOUT_TIME
            t_coast_total = self.APOGEE_TIME - self.BURNOUT_TIME
            progress = t_coast / t_coast_total

            h0 = 80.0
            h_max = self.MAX_ALTITUDE
            return h0 + (h_max - h0) * (1 - (1 - progress) ** 2)

        if t < self.LANDING_TIME:
            t_descent = t - self.APOGEE_TIME
            t_descent_total = self.LANDING_TIME - self.APOGEE_TIME
            altitude = self.MAX_ALTITUDE * math.exp(-2.5 * t_descent / t_descent_total)
            return max(0.0, altitude)

        return 0.0

    def _calculate_demo_altitude(self, t: float) -> float:
        if t < self.LIFTOFF_TIME:
            return 0.0

        if t < self.BURNOUT_TIME:
            duration = self.BURNOUT_TIME - self.LIFTOFF_TIME
            p = _clamp((t - self.LIFTOFF_TIME) / duration, 0.0, 1.0)

            # Cubic boost curve with continuous velocity at burnout.
            # h(0)=0, h'(0)=0, h(1)=BURNOUT_ALTITUDE, h'(1)=initial coast velocity.
            coast_initial_velocity = 2.0 * (self.MAX_ALTITUDE - self.BURNOUT_ALTITUDE) / (
                self.APOGEE_TIME - self.BURNOUT_TIME
            )

            a = 3.0 * self.BURNOUT_ALTITUDE - coast_initial_velocity * duration
            b = coast_initial_velocity * duration - 2.0 * self.BURNOUT_ALTITUDE

            return max(0.0, a * p * p + b * p * p * p)

        if t < self.APOGEE_TIME:
            coast_time = t - self.BURNOUT_TIME
            coast_duration = self.APOGEE_TIME - self.BURNOUT_TIME
            p = _clamp(coast_time / coast_duration, 0.0, 1.0)

            # Smoothly approach apogee with velocity trending toward zero.
            return self.BURNOUT_ALTITUDE + (
                self.MAX_ALTITUDE - self.BURNOUT_ALTITUDE
            ) * (1.0 - (1.0 - p) ** 2)

        if t < self.APOGEE_TIME + self.APOGEE_HOLD_TIME:
            return self.MAX_ALTITUDE

        if t < self.LANDING_TIME:
            descent_start = self.APOGEE_TIME + self.APOGEE_HOLD_TIME
            descent_duration = self.LANDING_TIME - descent_start
            p = _clamp((t - descent_start) / descent_duration, 0.0, 1.0)

            return self.MAX_ALTITUDE * (1.0 - _smoothstep(p))

        return 0.0

    def _calculate_velocity(self, t: float) -> float:
        """
        Vertical velocity from altitude derivative.
        Positive = ascending.
        Negative = descending.
        """
        dt = 0.02
        alt_before = self._calculate_altitude(max(0.0, t - dt))
        alt_after = self._calculate_altitude(t + dt)
        return (alt_after - alt_before) / (2.0 * dt)

    def _calculate_quaternion(self, t: float) -> tuple[float, float, float, float]:
        """
        Simulated attitude quaternion.

        The demo profile keeps yaw/roll modest so the frontend attitude view
        does not look like a broken sideways rocket. The original profile keeps
        the repository's original rolling behavior.
        """
        if self.profile == "original":
            return self._calculate_original_quaternion(t)

        return self._calculate_demo_quaternion(t)

    def _calculate_original_quaternion(self, t: float) -> tuple[float, float, float, float]:
        if t < self.LIFTOFF_TIME:
            return (1.0, 0.0, 0.0, 0.0)

        if t < self.BURNOUT_TIME:
            pitch_angle = math.radians(5.0 * (t - self.LIFTOFF_TIME) / self.BURNOUT_TIME)
            return (
                math.cos(pitch_angle / 2),
                math.sin(pitch_angle / 2),
                0.0,
                0.0,
            )

        roll_angle = math.radians(10.0 * (t - self.BURNOUT_TIME))
        pitch_angle = math.radians(5.0)

        quat_w = math.cos(roll_angle / 2) * math.cos(pitch_angle / 2)
        quat_x = math.sin(pitch_angle / 2)
        quat_y = 0.0
        quat_z = math.sin(roll_angle / 2) * math.cos(pitch_angle / 2)

        return (quat_w, quat_x, quat_y, quat_z)

    def _calculate_demo_quaternion(self, t: float) -> tuple[float, float, float, float]:
        if t < self.LIFTOFF_TIME:
            pitch_deg = 0.0
            roll_deg = 0.0
        elif t < self.BURNOUT_TIME:
            p = (t - self.LIFTOFF_TIME) / (self.BURNOUT_TIME - self.LIFTOFF_TIME)
            pitch_deg = 5.0 * p
            roll_deg = 2.0 * p
        elif t < self.APOGEE_TIME:
            p = (t - self.BURNOUT_TIME) / (self.APOGEE_TIME - self.BURNOUT_TIME)
            pitch_deg = 5.0 + 2.0 * math.sin(p * math.pi)
            roll_deg = 2.0 + 10.0 * p
        elif t < self.LANDING_TIME:
            p = (t - self.APOGEE_TIME) / (self.LANDING_TIME - self.APOGEE_TIME)
            pitch_deg = 7.0 * math.cos(p * math.pi)
            roll_deg = 12.0 + 6.0 * math.sin(p * 2.0 * math.pi)
        else:
            pitch_deg = 0.0
            roll_deg = 0.0

        pitch = math.radians(pitch_deg)
        roll = math.radians(roll_deg)

        cp = math.cos(pitch / 2.0)
        sp = math.sin(pitch / 2.0)
        cr = math.cos(roll / 2.0)
        sr = math.sin(roll / 2.0)

        quat_w = cr * cp
        quat_x = cr * sp
        quat_y = -sr * sp
        quat_z = sr * cp

        return (quat_w, quat_x, quat_y, quat_z)

    def _calculate_gps(self, t: float, altitude: float) -> tuple[float, float]:
        if t < self.LIFTOFF_TIME:
            return (self.BASE_LAT, self.BASE_LON)

        wind_speed_ms = 1.0 if self.profile == "original" else 1.35
        if self.profile == "demo" and t > self.APOGEE_TIME:
            wind_speed_ms = 1.75

        drift_distance_m = wind_speed_ms * (t - self.LIFTOFF_TIME)

        lat_offset = 0.0
        lon_offset = drift_distance_m / (111000.0 * math.cos(math.radians(self.BASE_LAT)))

        return (self.BASE_LAT + lat_offset, self.BASE_LON + lon_offset)

    async def start(self, callback):
        self.running = True
        loop = asyncio.get_running_loop()
        self.start_time = loop.time()

        logger.info("Mock data generator started using '%s' profile", self.profile)

        try:
            while self.running:
                current_time = loop.time()
                elapsed_time = current_time - self.start_time

                packet_bytes = await self.generate_packet(elapsed_time)
                await callback(packet_bytes)

                await asyncio.sleep(self.interval_sec)

        except asyncio.CancelledError:
            logger.info("Mock data generator cancelled")
            self.running = False
            raise
        except Exception as exc:
            logger.error(f"Mock data generator error: {exc}")
            self.running = False

    def stop(self):
        self.running = False
        logger.info("Mock data generator stopped")

