/**
 * Mission telemetry store
 * Handles WebSocket telemetry, backend status polling, telemetry history loading,
 * command uplink, events, warnings, and derived dashboard values.
 */

import { create } from 'zustand';

export interface TelemetryPacket {
  sync_byte: number;
  timestamp_ms: number;
  flight_state: number;
  flight_state_name: string;
  altitude_m: number;
  velocity_ms: number;
  quat_w: number;
  quat_x: number;
  quat_y: number;
  quat_z: number;
  gps_lat: number;
  gps_lon: number;
  checksum_xor: number;
  received_at: string | null;
  // Extended fields
  temperature_c: number;
  pressure_pa: number;
  battery_pct: number;
  signal_dbm: number;
}

export interface SystemStatus {
  connected: boolean;
  packets_received: number;
  packets_dropped: number;
  last_packet_time: string | null;
  websocket_clients: number;
  uptime_seconds: number;
}

export interface MissionEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'danger';
  message: string;
}

interface HistoryResponse {
  count: number;
  packets: TelemetryPacket[];
}

interface TelemetryState {
  ws: WebSocket | null;
  connected: boolean;
  connecting: boolean;
  mockMode: boolean;
  dataRateHz: number;

  latestPacket: TelemetryPacket | null;
  systemStatus: SystemStatus | null;

  altitudeHistory: Array<{ time: number; value: number }>;
  velocityHistory: Array<{ time: number; value: number }>;
  accelerationHistory: Array<{ time: number; value: number }>;
  temperatureHistory: Array<{ time: number; value: number }>;
  pressureHistory: Array<{ time: number; value: number }>;
  packetTimestamps: number[];

  packetsReceived: number;
  maxAltitude: number;
  maxVelocity: number;
  packetRateHz: number;
  packetLossPercent: number;

  armed: boolean;
  events: MissionEvent[];
  warnings: string[];

  connect: (url?: string) => void;
  disconnect: () => void;
  updatePacket: (packet: TelemetryPacket) => void;
  updateStatus: (status: SystemStatus) => void;
  fetchStatus: () => Promise<void>;
  loadHistory: () => Promise<void>;
  sendCommand: (command: string, parameters?: Record<string, unknown>) => Promise<void>;
  addEvent: (message: string, level?: MissionEvent['level']) => void;
  clearEvents: () => void;
}

const MAX_HISTORY_POINTS = 20000;
const ACCELERATION_WINDOW_SECONDS = 0.75;
const MIN_ACCELERATION_DT_SECONDS = 0.25;
const MAX_EVENTS = 100;

const getApiBaseUrl = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const getWsUrl = () => import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws/telemetry';

const makeEventId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const packetTimeSeconds = (packet: TelemetryPacket) => packet.timestamp_ms / 1000;

const isValidPacket = (packet: TelemetryPacket) =>
  Number.isFinite(packet.timestamp_ms) &&
  Number.isFinite(packet.altitude_m) &&
  Number.isFinite(packet.velocity_ms);

const appendUniquePoint = (
  history: Array<{ time: number; value: number }>,
  point: { time: number; value: number },
) => {
  const last = history.at(-1);

  if (last && Math.abs(last.time - point.time) < 0.0001) {
    return [...history.slice(0, -1), point].slice(-MAX_HISTORY_POINTS);
  }

  return [...history, point].slice(-MAX_HISTORY_POINTS);
};

const buildFilteredAccelerationHistory = (
  velocityHistory: Array<{ time: number; value: number }>,
) => {
  const accelerationHistory: Array<{ time: number; value: number }> = [];

  for (let i = 1; i < velocityHistory.length; i += 1) {
    const current = velocityHistory[i];
    const targetTime = current.time - ACCELERATION_WINDOW_SECONDS;

    let previous = velocityHistory[Math.max(0, i - 1)];

    for (let j = i - 1; j >= 0; j -= 1) {
      if (velocityHistory[j].time <= targetTime) {
        previous = velocityHistory[j];
        break;
      }
    }

    const dt = current.time - previous.time;

    if (dt >= MIN_ACCELERATION_DT_SECONDS && dt < 5) {
      accelerationHistory.push({
        time: current.time,
        value: (current.value - previous.value) / dt,
      });
    }
  }

  return accelerationHistory.slice(-MAX_HISTORY_POINTS);
};
const buildHistoriesFromPackets = (packets: TelemetryPacket[]) => {
  const sortedPackets = packets
    .filter(isValidPacket)
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
    .slice(-MAX_HISTORY_POINTS);

  const altitudeHistory = sortedPackets.map((packet) => ({
    time: packetTimeSeconds(packet),
    value: packet.altitude_m,
  }));

  const velocityHistory = sortedPackets.map((packet) => ({
    time: packetTimeSeconds(packet),
    value: packet.velocity_ms,
  }));

  const accelerationHistory = buildFilteredAccelerationHistory(velocityHistory);

  const maxAltitude = sortedPackets.reduce((max, packet) => Math.max(max, packet.altitude_m), 0);
  const maxVelocity = sortedPackets.reduce((max, packet) => Math.max(max, Math.abs(packet.velocity_ms)), 0);

  return {
    sortedPackets,
    altitudeHistory,
    velocityHistory,
    accelerationHistory,
    maxAltitude,
    maxVelocity,
  };
};

const buildWarnings = (
  connected: boolean,
  status: SystemStatus | null,
  packetRateHz: number,
  latestPacket: TelemetryPacket | null,
) => {
  const warnings: string[] = [];

  if (!connected) warnings.push('Telemetry WebSocket disconnected');
  if (status && status.packets_dropped > 0) warnings.push(`${status.packets_dropped} packet(s) dropped by decoder`);
  if (connected && packetRateHz === 0) warnings.push('No packets received in the last second');

  if (latestPacket?.received_at) {
    const rawTime = latestPacket.received_at;
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(rawTime);
    const parsedMs = Date.parse(hasTimezone ? rawTime : `${rawTime}Z`);
    const ageSeconds = (Date.now() - parsedMs) / 1000;

    if (Number.isFinite(ageSeconds) && ageSeconds > 3 && ageSeconds < 3600) {
      warnings.push(`Telemetry stale: last packet ${ageSeconds.toFixed(1)}s ago`);
    }
  }

  if (latestPacket) {
    const gpsLooksInvalid =
      Math.abs(latestPacket.gps_lat) < 0.000001 &&
      Math.abs(latestPacket.gps_lon) < 0.000001;

    if (gpsLooksInvalid) warnings.push('GPS coordinates look invalid');
  }

  return warnings;
};

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  ws: null,
  connected: false,
  connecting: false,
  mockMode: false,
  dataRateHz: 0,

  latestPacket: null,
  systemStatus: null,

  altitudeHistory: [],
  velocityHistory: [],
  accelerationHistory: [],
  temperatureHistory: [],
  pressureHistory: [],
  packetTimestamps: [],

  packetsReceived: 0,
  maxAltitude: 0,
  maxVelocity: 0,
  packetRateHz: 0,
  packetLossPercent: 0,

  armed: false,
  events: [],
  warnings: ['Telemetry WebSocket disconnected'],

  connect: (url?: string) => {
    const state = get();
    const wsUrl = url ?? getWsUrl();

    if (state.ws) {
      state.ws.close();
    }

    set({ connecting: true });

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ connected: true, connecting: false, ws });
      get().addEvent('WebSocket connected', 'info');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          set({
            mockMode: Boolean(data.mock_mode),
            dataRateHz: Number(data.data_rate_hz ?? 0),
          });

          get().addEvent(`Telemetry stream ready (${data.mock_mode ? 'MOCK' : 'LIVE'} mode)`, 'info');
          return;
        }

        if (data.flight_state_name) {
          get().updatePacket(data as TelemetryPacket);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        get().addEvent('Failed to parse WebSocket message', 'warning');
      }
    };

    ws.onerror = () => {
      set({ connected: false, connecting: false });
      get().addEvent('WebSocket error', 'danger');
    };

    ws.onclose = () => {
      const status = get().systemStatus;
      const latestPacket = get().latestPacket;

      set({
        connected: false,
        connecting: false,
        ws: null,
        warnings: buildWarnings(false, status, 0, latestPacket),
      });

      get().addEvent('WebSocket disconnected', 'warning');
    };
  },

  disconnect: () => {
    const state = get();

    if (state.ws) {
      state.ws.close();
      set({ ws: null, connected: false });
    }
  },

  updatePacket: (packet: TelemetryPacket) => {
    const state = get();
    const time = packetTimeSeconds(packet);
    const now = Date.now();

    const missionClockReset =
      Boolean(state.latestPacket) &&
      packet.timestamp_ms + 1000 < (state.latestPacket?.timestamp_ms ?? 0);

    const baseAltitudeHistory = missionClockReset ? [] : state.altitudeHistory;
    const baseVelocityHistory = missionClockReset ? [] : state.velocityHistory;

    const newAltitudeHistory = appendUniquePoint(baseAltitudeHistory, {
      time,
      value: packet.altitude_m,
    });

    const newVelocityHistory = appendUniquePoint(baseVelocityHistory, {
      time,
      value: packet.velocity_ms,
    });

    const newAccelerationHistory = buildFilteredAccelerationHistory(newVelocityHistory);

    const baseTemperatureHistory = missionClockReset ? [] : state.temperatureHistory;
    const basePressureHistory = missionClockReset ? [] : state.pressureHistory;

    const newTemperatureHistory = appendUniquePoint(baseTemperatureHistory, {
      time,
      value: packet.temperature_c ?? 25,
    });

    const newPressureHistory = appendUniquePoint(basePressureHistory, {
      time,
      value: packet.pressure_pa ?? 101325,
    });

    const newPacketTimestamps = [...state.packetTimestamps, now].filter((timestamp) => now - timestamp <= 1000);

    const maxAltitude = missionClockReset
      ? Math.max(0, packet.altitude_m)
      : Math.max(state.maxAltitude, packet.altitude_m);

    const maxVelocity = missionClockReset
      ? Math.max(0, Math.abs(packet.velocity_ms))
      : Math.max(state.maxVelocity, Math.abs(packet.velocity_ms));

    const packetsReceived = missionClockReset ? 1 : state.packetsReceived + 1;
    const previousStateName = missionClockReset ? null : state.latestPacket?.flight_state_name;
    const warnings = buildWarnings(true, state.systemStatus, newPacketTimestamps.length, packet);

    set({
      latestPacket: packet,
      altitudeHistory: newAltitudeHistory,
      velocityHistory: newVelocityHistory,
      accelerationHistory: newAccelerationHistory,
      temperatureHistory: newTemperatureHistory,
      pressureHistory: newPressureHistory,
      packetTimestamps: newPacketTimestamps,
      packetRateHz: newPacketTimestamps.length,
      packetsReceived,
      maxAltitude,
      maxVelocity,
      warnings,
    });

    if (missionClockReset) {
      get().addEvent('Mission clock reset detected; started new telemetry session', 'info');
    }

    if (previousStateName && previousStateName !== packet.flight_state_name) {
      get().addEvent(`Flight state changed: ${previousStateName} -> ${packet.flight_state_name}`, 'info');
    }
  },

  updateStatus: (status: SystemStatus) => {
    const state = get();
    const totalPackets = status.packets_received + status.packets_dropped;
    const packetLossPercent = totalPackets > 0 ? (status.packets_dropped / totalPackets) * 100 : 0;

    set({
      systemStatus: status,
      packetLossPercent,
      warnings: buildWarnings(state.connected, status, state.packetRateHz, state.latestPacket),
    });
  },

  fetchStatus: async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/status`);
      if (!response.ok) throw new Error(`Status request failed: ${response.status}`);

      const status = (await response.json()) as SystemStatus;
      get().updateStatus(status);
    } catch (error) {
      console.error(error);
      const state = get();

      set({
        warnings: [
          ...buildWarnings(state.connected, state.systemStatus, state.packetRateHz, state.latestPacket),
          'Backend status API unavailable',
        ],
      });
    }
  },

  loadHistory: async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/telemetry/history?limit=${MAX_HISTORY_POINTS}`);

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error(`History request failed: ${response.status}`);
        }

        get().addEvent('No telemetry history available yet', 'warning');
        return;
      }

      const payload = (await response.json()) as HistoryResponse;
      const packets = Array.isArray(payload.packets) ? payload.packets : [];

      if (packets.length === 0) {
        get().addEvent('No telemetry history available yet', 'warning');
        return;
      }

      const {
        sortedPackets,
        altitudeHistory,
        velocityHistory,
        accelerationHistory,
        maxAltitude,
        maxVelocity,
      } = buildHistoriesFromPackets(packets);

      const latestPacket = sortedPackets.at(-1) ?? null;
      const state = get();

      set({
        latestPacket,
        altitudeHistory,
        velocityHistory,
        accelerationHistory,
        packetsReceived: Math.max(state.packetsReceived, sortedPackets.length),
        maxAltitude,
        maxVelocity,
        warnings: buildWarnings(state.connected, state.systemStatus, state.packetRateHz, latestPacket),
      });

      get().addEvent(`Loaded ${sortedPackets.length} telemetry history packets`, 'info');
    } catch (error) {
      console.error(error);
      get().addEvent('Failed to load telemetry history', 'warning');
    }
  },

  sendCommand: async (command: string, parameters: Record<string, unknown> = {}) => {
    if (command === 'RESET') {
      const profile = typeof parameters.profile === 'string' ? parameters.profile : 'demo';

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/mock/reset?profile=${encodeURIComponent(profile)}`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Mock reset failed: ${response.status}`);
        }

        let result: { profile?: string } = {};
        try {
          result = await response.json();
        } catch {
          result = { profile };
        }

        set({
          armed: false,
          latestPacket: null,
          altitudeHistory: [],
          velocityHistory: [],
          accelerationHistory: [],
          temperatureHistory: [],
          pressureHistory: [],
          maxAltitude: 0,
          maxVelocity: 0,
          packetsReceived: 0,
          packetRateHz: 0,
          packetLossPercent: 0,
          warnings: [],
        });

        get().addEvent(`Mock mission reset (${result.profile ?? profile} profile)`, 'info');
        return;
      } catch (error) {
        get().addEvent('Mock mission reset failed', 'danger');
        throw error;
      }
    }

    const response = await fetch(`${getApiBaseUrl()}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, parameters }),
    });

    if (!response.ok) {
      get().addEvent(`Command failed: ${command}`, 'danger');
      throw new Error(`Command failed: ${response.status}`);
    }

    const result = await response.json();
    get().addEvent(`Command ${command} ${result.status ?? 'sent'}`, 'info');

    if (command === 'ARM') set({ armed: true });
    if (command === 'DISARM' || command === 'ABORT') set({ armed: false });
  },

  addEvent: (message: string, level: MissionEvent['level'] = 'info') => {
    const event: MissionEvent = {
      id: makeEventId(),
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_EVENTS),
    }));
  },

  clearEvents: () => set({ events: [] }),
}));




