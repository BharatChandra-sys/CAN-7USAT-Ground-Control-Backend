/**
 * Zustand store for telemetry data
 * Manages WebSocket connection and real-time data updates
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
  received_at: string;
}

export interface SystemStatus {
  connected: boolean;
  packets_received: number;
  packets_dropped: number;
  last_packet_time: string | null;
  websocket_clients: number;
  uptime_seconds: number;
}

interface TelemetryState {
  // Connection
  ws: WebSocket | null;
  connected: boolean;
  connecting: boolean;
  
  // Latest data
  latestPacket: TelemetryPacket | null;
  systemStatus: SystemStatus | null;
  
  // Historical data for charts
  altitudeHistory: Array<{ time: number; value: number }>;
  velocityHistory: Array<{ time: number; value: number }>;
  
  // Statistics
  packetsReceived: number;
  maxAltitude: number;
  maxVelocity: number;
  
  // Actions
  connect: (url: string) => void;
  disconnect: () => void;
  updatePacket: (packet: TelemetryPacket) => void;
  updateStatus: (status: SystemStatus) => void;
}

const MAX_HISTORY_POINTS = 500; // Keep last 500 points (50 seconds at 10 Hz)

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  // Initial state
  ws: null,
  connected: false,
  connecting: false,
  latestPacket: null,
  systemStatus: null,
  altitudeHistory: [],
  velocityHistory: [],
  packetsReceived: 0,
  maxAltitude: 0,
  maxVelocity: 0,
  
  // Connect to WebSocket
  connect: (url: string) => {
    const state = get();
    
    if (state.ws) {
      state.ws.close();
    }
    
    set({ connecting: true });
    
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      set({ connected: true, connecting: false, ws });
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle connection message
        if (data.type === 'connected') {
          console.log('Server:', data.message);
          return;
        }
        
        // Handle telemetry packet
        if (data.flight_state_name) {
          get().updatePacket(data);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ connected: false, connecting: false });
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ connected: false, connecting: false, ws: null });
    };
  },
  
  // Disconnect from WebSocket
  disconnect: () => {
    const state = get();
    if (state.ws) {
      state.ws.close();
      set({ ws: null, connected: false });
    }
  },
  
  // Update with new telemetry packet
  updatePacket: (packet: TelemetryPacket) => {
    const state = get();
    const time = packet.timestamp_ms / 1000; // Convert to seconds
    
    // Update altitude history
    const newAltitudeHistory = [
      ...state.altitudeHistory,
      { time, value: packet.altitude_m }
    ].slice(-MAX_HISTORY_POINTS);
    
    // Update velocity history
    const newVelocityHistory = [
      ...state.velocityHistory,
      { time, value: packet.velocity_ms }
    ].slice(-MAX_HISTORY_POINTS);
    
    // Update max values
    const maxAltitude = Math.max(state.maxAltitude, packet.altitude_m);
    const maxVelocity = Math.max(state.maxVelocity, Math.abs(packet.velocity_ms));
    
    set({
      latestPacket: packet,
      altitudeHistory: newAltitudeHistory,
      velocityHistory: newVelocityHistory,
      packetsReceived: state.packetsReceived + 1,
      maxAltitude,
      maxVelocity
    });
  },
  
  // Update system status
  updateStatus: (status: SystemStatus) => {
    set({ systemStatus: status });
  }
}));
