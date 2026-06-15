import { useMemo, useState } from 'react';
import Dashboard from '../Dashboard';
import { TelemetryChart } from '../TelemetryChart';
import { OperatorChart } from '../OperatorChart';
import { useTelemetryStore } from '../../stores/telemetryStore';

type PageKey = 'mission' | 'telemetry' | 'analysis' | 'logs' | 'config';
type DataSource = 'REAL' | 'DERIVED' | 'ESTIMATED' | 'SIMULATED';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws/telemetry';

const pages: Array<{ key: PageKey; label: string; code: string }> = [
  { key: 'mission',   label: 'Mission Control',  code: 'MC' },
  { key: 'telemetry', label: 'Engineering Telemetry', code: 'ET' },
  { key: 'analysis',  label: 'Flight Analysis',  code: 'FA' },
  { key: 'logs',      label: 'Telemetry Logs',   code: 'TL' },
  { key: 'config',    label: 'Mission Config',   code: 'CF' },
];

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;

  return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':');
};

const formatNum = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
};

const stateLabel = (value?: string | null) => value?.replaceAll('_', '-') ?? 'NO DATA';

const quaternionToEuler = (w: number, x: number, y: number, z: number) => {
  const sinrCosp = 2 * (w * x + y * z);
  const cosrCosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  const sinyCosp = 2 * (w * z + x * y);
  const cosyCosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return {
    roll: roll * 180 / Math.PI,
    pitch: pitch * 180 / Math.PI,
    yaw: yaw * 180 / Math.PI,
  };
};

const DataTag = ({ type }: { type: DataSource }) => (
  <span className={`aero-tag ${type.toLowerCase()}`}>{type}</span>
);

const Readout = ({
  label,
  value,
  unit,
  type = 'REAL',
}: {
  label: string;
  value: string | number;
  unit?: string;
  type?: DataSource;
}) => (
  <div className="aero-readout">
    <div className="aero-readout-head">
      <span>{label}</span>
      <DataTag type={type} />
    </div>
    <strong>
      {value}
      {unit ? <em>{unit}</em> : null}
    </strong>
  </div>
);


const getRobustPeakAbs = (series: FlightChartPoint[]) => {
  if (series.length === 0) return 0;

  const values = series
    .map((point) => Math.abs(point.value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (values.length === 0) return 0;

  // Ignore the top 2% single-frame derivative spikes.
  const index = Math.max(0, Math.min(values.length - 1, Math.floor(values.length * 0.98)));
  return values[index];
};

const EngineeringTelemetry = () => {
  const {
    latestPacket,
    systemStatus,
    altitudeHistory,
    accelerationHistory,
    temperatureHistory,
    pressureHistory,
    packetRateHz,
    packetLossPercent,
    maxAltitude,
    maxVelocity,
  } = useTelemetryStore();

  const latestAcceleration = accelerationHistory.at(-1)?.value ?? 0;
  const accelerationStats = getSeriesStats(accelerationHistory);
  const robustPeakAcceleration = getRobustPeakAbs(accelerationHistory);

  const euler = latestPacket
    ? quaternionToEuler(latestPacket.quat_w, latestPacket.quat_x, latestPacket.quat_y, latestPacket.quat_z)
    : { roll: 0, pitch: 0, yaw: 0 };

  const checksum = latestPacket
    ? `0x${latestPacket.checksum_xor.toString(16).toUpperCase().padStart(2, '0')}`
    : 'N/A';

  const packetTimestampSeconds = (latestPacket?.timestamp_ms ?? 0) / 1000;

  return (
    <section className="aero-page engineering-page">
      <div className="aero-page-title engineering-title">
        <div>
          <span>TELEMETRY MATRIX // CAN-7USAT</span>
          <h2>Mission Control</h2>
        </div>
        <div className="engineering-timebox">
          <span>MISSION TIME</span>
          <strong>T+ {formatDuration(packetTimestampSeconds)}</strong>
        </div>
      </div>

      {/* ── 12-readout matrix: original 8 + 4 new ── */}
      <div className="aero-matrix-grid engineering-matrix-grid">
        <Readout label="Altitude" value={formatNum(latestPacket?.altitude_m ?? 0, 2)} unit="m" />
        <Readout label="Vertical Velocity" value={formatNum(latestPacket?.velocity_ms ?? 0, 2)} unit="m/s" />
        <Readout label="Derived Acceleration" value={formatNum(latestAcceleration, 2)} unit="m/s²" type="DERIVED" />
        <Readout label="Flight State" value={latestPacket?.flight_state_name ?? 'N/A'} />
        <Readout label="Max Altitude" value={formatNum(maxAltitude, 2)} unit="m" type="DERIVED" />
        <Readout label="Max Vertical Velocity" value={formatNum(maxVelocity, 2)} unit="m/s" type="DERIVED" />
        <Readout label="Peak Abs Accel" value={formatNum(robustPeakAcceleration, 2)} unit="m/s²" type="DERIVED" />
        <Readout label="Checksum" value={checksum} />
        {/* New extended fields */}
        <Readout label="Temperature" value={formatNum(latestPacket?.temperature_c ?? 25, 1)} unit="°C" />
        <Readout label="Pressure" value={formatNum(latestPacket?.pressure_pa ?? 101325, 0)} unit="Pa" />
        <Readout label="Battery" value={formatNum(latestPacket?.battery_pct ?? 100, 0)} unit="%" />
        <Readout label="Signal Strength" value={formatNum(latestPacket?.signal_dbm ?? -70, 0)} unit="dBm" />
      </div>

      <div className="aero-telemetry-layout engineering-layout">
        {/* Primary channel table — updated with new fields */}
        <div className="aero-panel span-2 engineering-channel-panel">
          <div className="aero-panel-head">
            <span>PRIMARY FLIGHT CHANNELS</span>
            <em>REAL PACKETS / DERIVED SIGNALS</em>
          </div>

          <div className="engineering-channel-table">
            <div><span>timestamp_ms</span><strong>{latestPacket?.timestamp_ms ?? 0}</strong><DataTag type="REAL" /></div>
            <div><span>mission_timer</span><strong>{formatDuration(packetTimestampSeconds)}</strong><DataTag type="DERIVED" /></div>
            <div><span>flight_state</span><strong>{latestPacket?.flight_state_name ?? 'N/A'}</strong><DataTag type="REAL" /></div>
            <div><span>altitude_m</span><strong>{formatNum(latestPacket?.altitude_m ?? 0, 2)} m</strong><DataTag type="REAL" /></div>
            <div><span>velocity_ms</span><strong>{formatNum(latestPacket?.velocity_ms ?? 0, 2)} m/s</strong><DataTag type="REAL" /></div>
            <div><span>derived_accel_ms2</span><strong>{formatNum(latestAcceleration, 2)} m/s²</strong><DataTag type="DERIVED" /></div>
            <div><span>temperature_c</span><strong>{formatNum(latestPacket?.temperature_c ?? 25, 1)} °C</strong><DataTag type="REAL" /></div>
            <div><span>pressure_pa</span><strong>{formatNum(latestPacket?.pressure_pa ?? 101325, 0)} Pa</strong><DataTag type="REAL" /></div>
            <div><span>battery_pct</span><strong>{formatNum(latestPacket?.battery_pct ?? 100, 0)} %</strong><DataTag type="REAL" /></div>
            <div><span>signal_dbm</span><strong>{formatNum(latestPacket?.signal_dbm ?? -70, 0)} dBm</strong><DataTag type="REAL" /></div>
            <div><span>gps_lat</span><strong>{formatNum(latestPacket?.gps_lat ?? 0, 6)}</strong><DataTag type="REAL" /></div>
            <div><span>gps_lon</span><strong>{formatNum(latestPacket?.gps_lon ?? 0, 6)}</strong><DataTag type="REAL" /></div>
            <div><span>accel_peak_abs_robust</span><strong>{formatNum(robustPeakAcceleration, 2)} m/s²</strong><DataTag type="DERIVED" /></div>
            <div><span>accel_avg</span><strong>{formatNum(accelerationStats.average, 2)} m/s²</strong><DataTag type="DERIVED" /></div>
            <div><span>checksum_xor</span><strong>{checksum}</strong><DataTag type="REAL" /></div>
          </div>
        </div>

        {/* Altitude · Velocity · Acceleration — renamed panel */}
        <div className="aero-panel">
          <div className="aero-panel-head">
            <span>ALTITUDE · VELOCITY · ACCELERATION</span>
            <em>REAL + DERIVED</em>
          </div>
          <div className="aero-table attitude-table">
            <div><span>ALTITUDE</span><strong>{formatNum(latestPacket?.altitude_m ?? 0, 2)} m</strong><DataTag type="REAL" /></div>
            <div><span>VELOCITY</span><strong>{formatNum(latestPacket?.velocity_ms ?? 0, 2)} m/s</strong><DataTag type="REAL" /></div>
            <div><span>ACCEL</span><strong>{formatNum(latestAcceleration, 2)} m/s²</strong><DataTag type="DERIVED" /></div>
            <div><span>ROLL</span><strong>{formatNum(euler.roll, 2)}°</strong><DataTag type="DERIVED" /></div>
            <div><span>PITCH</span><strong>{formatNum(euler.pitch, 2)}°</strong><DataTag type="DERIVED" /></div>
            <div><span>YAW</span><strong>{formatNum(euler.yaw, 2)}°</strong><DataTag type="DERIVED" /></div>
            <div><span>MAX ALT</span><strong>{formatNum(maxAltitude, 2)} m</strong><DataTag type="DERIVED" /></div>
            <div><span>MAX VEL</span><strong>{formatNum(maxVelocity, 2)} m/s</strong><DataTag type="DERIVED" /></div>
          </div>
        </div>

        {/* Link / Packet Integrity */}
        <div className="aero-panel">
          <div className="aero-panel-head">
            <span>LINK / PACKET INTEGRITY</span>
            <em>BACKEND STATUS</em>
          </div>
          <div className="aero-table integrity-table">
            <div><span>PACKETS_RECEIVED</span><strong>{systemStatus?.packets_received ?? 0}</strong><DataTag type="REAL" /></div>
            <div><span>PACKETS_DROPPED</span><strong>{systemStatus?.packets_dropped ?? 0}</strong><DataTag type="REAL" /></div>
            <div><span>PACKET_RATE</span><strong>{packetRateHz} Hz</strong><DataTag type="DERIVED" /></div>
            <div><span>PACKET_LOSS</span><strong>{formatNum(packetLossPercent, 2)} %</strong><DataTag type="DERIVED" /></div>
            <div><span>SIGNAL_DBM</span><strong>{formatNum(latestPacket?.signal_dbm ?? -70, 0)} dBm</strong><DataTag type="REAL" /></div>
            <div><span>BATTERY_PCT</span><strong>{formatNum(latestPacket?.battery_pct ?? 100, 0)} %</strong><DataTag type="REAL" /></div>
            <div><span>WEBSOCKET_CLIENTS</span><strong>{systemStatus?.websocket_clients ?? 0}</strong><DataTag type="REAL" /></div>
            <div><span>BACKEND_UPTIME</span><strong>{formatDuration(systemStatus?.uptime_seconds ?? 0)}</strong><DataTag type="REAL" /></div>
            <div><span>LAST_PACKET_TIME</span><strong>{systemStatus?.last_packet_time ?? 'N/A'}</strong><DataTag type="REAL" /></div>
          </div>
        </div>

        {/* GPS / Position */}
        <div className="aero-panel">
          <div className="aero-panel-head">
            <span>GPS COORDINATES</span>
            <em>REAL PACKET FIELDS</em>
          </div>
          <div className="aero-table gps-engineering-table">
            <div><span>GPS_LAT</span><strong>{formatNum(latestPacket?.gps_lat ?? 0, 6)}</strong><DataTag type="REAL" /></div>
            <div><span>GPS_LON</span><strong>{formatNum(latestPacket?.gps_lon ?? 0, 6)}</strong><DataTag type="REAL" /></div>
            <div><span>FIX_STATUS</span><strong>VALID</strong><DataTag type="SIMULATED" /></div>
            <div><span>DRIFT_MODEL</span><strong>WIND EASTWARD</strong><DataTag type="SIMULATED" /></div>
          </div>
        </div>

        {/* Altitude Profile chart */}
        <div className="aero-panel span-2 engineering-chart-panel">
          <div className="aero-panel-head">
            <span>ALTITUDE PROFILE</span>
            <em>REAL PACKET FIELD: altitude_m</em>
          </div>
          <OperatorChart data={altitudeHistory} label="Engineering Altitude Profile" unit="m" />
        </div>

        {/* Rocket Vibration Data — renamed from Structural Vibration */}
        <div className="aero-panel span-2 engineering-chart-panel">
          <div className="aero-panel-head">
            <span>ROCKET VIBRATION DATA</span>
            <em>DERIVED FILTERED: Δv / Δt (acceleration proxy)</em>
          </div>
          <div className="aero-chart-slot engineering-small-chart">
            <TelemetryChart data={accelerationHistory} unit="m/s²" />
          </div>
        </div>

        {/* Temperature vs Time — renamed from Thermal Gradient */}
        <div className="aero-panel span-2 engineering-chart-panel">
          <div className="aero-panel-head">
            <span>TEMPERATURE vs TIME</span>
            <em>REAL PACKET FIELD: temperature_c</em>
          </div>
          <div className="aero-chart-slot engineering-small-chart">
            <TelemetryChart data={temperatureHistory} unit="°C" />
          </div>
        </div>

        {/* Pressure chart */}
        <div className="aero-panel span-2 engineering-chart-panel">
          <div className="aero-panel-head">
            <span>PRESSURE PROFILE</span>
            <em>REAL PACKET FIELD: pressure_pa</em>
          </div>
          <div className="aero-chart-slot engineering-small-chart">
            <TelemetryChart data={pressureHistory} unit="Pa" />
          </div>
        </div>
      </div>
    </section>
  );
};

type FlightChartPoint = {
  time: number;
  value: number;
};

const formatMissionTime = (seconds: number | undefined) => {
  if (!Number.isFinite(seconds ?? NaN)) return '--:--:--';

  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;

  return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':');
};

const formatMetric = (value: number | undefined, digits = 2) => {
  if (!Number.isFinite(value ?? NaN)) return 'N/A';
  return (value ?? 0).toFixed(digits);
};

const getSeriesStats = (series: FlightChartPoint[]) => {
  if (series.length === 0) {
    return {
      current: 0,
      min: 0,
      max: 0,
      average: 0,
      range: 0,
      samples: 0,
      peakPoint: { time: 0, value: 0 },
      finalPoint: { time: 0, value: 0 },
    };
  }

  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const peakPoint = series.reduce(
    (best, point) => (Math.abs(point.value) > Math.abs(best.value) ? point : best),
    series[0],
  );
  const finalPoint = series.at(-1) ?? series[0];

  return {
    current: finalPoint.value,
    min,
    max,
    average,
    range: max - min,
    samples: series.length,
    peakPoint,
    finalPoint,
  };
};

const formatEventTime = (timestamp: string | number | Date) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString();
};

const FlightAnalysis = () => {
  const {
    latestPacket,
    altitudeHistory,
    velocityHistory,
    accelerationHistory,
    events,
  } = useTelemetryStore();

  const altitudeStats = getSeriesStats(altitudeHistory);
  const velocityStats = getSeriesStats(velocityHistory);
  const accelerationStats = getSeriesStats(accelerationHistory);

  const flightDurationSeconds =
    latestPacket?.timestamp_ms !== undefined
      ? latestPacket.timestamp_ms / 1000
      : altitudeStats.finalPoint.time;

  const stateTransitions = events
    .filter((event) => event.message.startsWith('Flight state changed:'))
    .slice(0, 8);

  const landingLat = latestPacket?.gps_lat;
  const landingLon = latestPacket?.gps_lon;
  const isLanded = latestPacket?.flight_state_name === 'LANDED';

  return (
    <div className="aero-page analysis-page">
      <div className="aero-hero analysis-hero">
        <div>
          <span>POST-FLIGHT REVIEW // CAN-7USAT</span>
          <h2>Flight Analysis</h2>
        </div>
        <div className="analysis-hero-status">
          <span>{isLanded ? 'MISSION COMPLETE' : 'MISSION IN PROGRESS'}</span>
          <strong>T+ {formatMissionTime(flightDurationSeconds)}</strong>
        </div>
      </div>

      <div className="analysis-summary-grid">
        <div className="analysis-metric-card">
          <span>APOGEE</span>
          <strong>{formatMetric(altitudeStats.max, 2)} <em>m</em></strong>
          <DataTag type="DERIVED" />
        </div>

        <div className="analysis-metric-card">
          <span>TIME TO APOGEE</span>
          <strong>{formatMissionTime(altitudeStats.peakPoint.time)}</strong>
          <DataTag type="DERIVED" />
        </div>

        <div className="analysis-metric-card">
          <span>MAX VERTICAL VELOCITY</span>
          <strong>{formatMetric(velocityStats.max, 2)} <em>m/s</em></strong>
          <DataTag type="DERIVED" />
        </div>

        <div className="analysis-metric-card">
          <span>MAX DERIVED ACCEL</span>
          <strong>{formatMetric(accelerationStats.max, 2)} <em>m/s2</em></strong>
          <DataTag type="DERIVED" />
        </div>

        <div className="analysis-metric-card">
          <span>FLIGHT DURATION</span>
          <strong>{formatMissionTime(flightDurationSeconds)}</strong>
          <DataTag type="REAL" />
        </div>

        <div className="analysis-metric-card">
          <span>FINAL VERTICAL VELOCITY</span>
          <strong>{formatMetric(latestPacket?.velocity_ms, 2)} <em>m/s</em></strong>
          <DataTag type="REAL" />
        </div>

        <div className="analysis-metric-card">
          <span>LANDING LAT</span>
          <strong>{formatMetric(landingLat, 6)}</strong>
          <DataTag type="REAL" />
        </div>

        <div className="analysis-metric-card">
          <span>LANDING LON</span>
          <strong>{formatMetric(landingLon, 6)}</strong>
          <DataTag type="REAL" />
        </div>
      </div>

      <div className="analysis-main-grid">
        <section className="analysis-panel analysis-chart-panel">
          <header>
            <div>
              <span>ALTITUDE HISTORY</span>
              <h3>Flight Profile</h3>
            </div>
            <DataTag type="REAL" />
          </header>
          <OperatorChart data={altitudeHistory} label="Post-Flight Altitude Profile" unit="m" />
        </section>

        <section className="analysis-panel">
          <header>
            <div>
              <span>FRONTEND EVENT LOG</span>
              <h3>State Transition Table</h3>
            </div>
            <DataTag type="DERIVED" />
          </header>

          <div className="analysis-transition-table">
            {stateTransitions.length === 0 ? (
              <div className="analysis-empty-row">
                No state transitions recorded yet.
              </div>
            ) : (
              stateTransitions.map((event, index) => (
                <div className="analysis-transition-row" key={`${event.timestamp}-${index}`}>
                  <span>{formatEventTime(event.timestamp)}</span>
                  <strong>FLIGHT</strong>
                  <p>{event.message.replace('Flight state changed: ', '')}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const getLogChannel = (message: string) => {
  const upper = message.toUpperCase();

  if (upper.includes('COMMAND')) return 'CMD';
  if (upper.includes('FLIGHT STATE')) return 'STATE';
  if (upper.includes('WEBSOCKET')) return 'WS';
  if (upper.includes('RESET')) return 'RESET';
  if (upper.includes('FAILED') || upper.includes('ERROR')) return 'ERR';
  if (upper.includes('WARNING') || upper.includes('STALE')) return 'WARN';

  return 'SYS';
};

const getLogLevel = (message: string) => {
  const upper = message.toUpperCase();

  if (upper.includes('FAILED') || upper.includes('ERROR')) return 'DANGER';
  if (upper.includes('WARNING') || upper.includes('STALE')) return 'WARN';
  if (upper.includes('RESET')) return 'ACTION';
  if (upper.includes('FLIGHT STATE')) return 'STATE';

  return 'INFO';
};

const SystemLogs = () => {
  const { events, warnings, connected, packetRateHz, packetLossPercent } = useTelemetryStore();

  const visibleEvents = events.slice(0, 80);
  const commandEvents = events.filter((event) => event.message.toUpperCase().includes('COMMAND')).length;
  const stateEvents = events.filter((event) => event.message.toUpperCase().includes('FLIGHT STATE')).length;
  const websocketEvents = events.filter((event) => event.message.toUpperCase().includes('WEBSOCKET')).length;

  return (
    <section className="aero-page logs-page">
      <div className="aero-page-title logs-title">
        <div>
          <span>TERMINAL EVENT STREAM // CAN-7USAT</span>
          <h2>Telemetry Logs</h2>
        </div>
        <div className="logs-status-strip">
          <div><span>ROWS</span><strong>{events.length}</strong></div>
          <div><span>WARN</span><strong>{warnings.length}</strong></div>
          <div><span>LINK</span><strong>{connected ? 'ONLINE' : 'OFFLINE'}</strong></div>
          <div><span>RATE</span><strong>{packetRateHz} Hz</strong></div>
        </div>
      </div>

      <div className="logs-summary-grid">
        <div className="logs-summary-card">
          <span>COMMAND EVENTS</span>
          <strong>{commandEvents}</strong>
          <DataTag type="DERIVED" />
        </div>
        <div className="logs-summary-card">
          <span>STATE TRANSITIONS</span>
          <strong>{stateEvents}</strong>
          <DataTag type="DERIVED" />
        </div>
        <div className="logs-summary-card">
          <span>WEBSOCKET EVENTS</span>
          <strong>{websocketEvents}</strong>
          <DataTag type="REAL" />
        </div>
        <div className="logs-summary-card">
          <span>PACKET LOSS</span>
          <strong>{formatNum(packetLossPercent, 2)} <em>%</em></strong>
          <DataTag type="DERIVED" />
        </div>
      </div>

      <div className="logs-grid">
        <section className="logs-panel event-stream-panel">
          <header>
            <div>
              <span>EVENT LOG</span>
              <h3>Operator Event Stream</h3>
            </div>
            <DataTag type="REAL" />
          </header>

          <div className="terminal-log-table">
            <div className="terminal-log-header">
              <span>TIME</span>
              <span>CH</span>
              <span>LEVEL</span>
              <span>MESSAGE</span>
            </div>

            {visibleEvents.length === 0 ? (
              <div className="terminal-log-empty">No system events recorded yet.</div>
            ) : (
              visibleEvents.map((event, index) => {
                const channel = getLogChannel(event.message);
                const level = getLogLevel(event.message);

                return (
                  <div className={`terminal-log-row level-${level.toLowerCase()}`} key={`${event.timestamp}-${index}`}>
                    <span>{formatEventTime(event.timestamp)}</span>
                    <strong>{channel}</strong>
                    <em>{level}</em>
                    <p>{event.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="logs-panel warning-stream-panel">
          <header>
            <div>
              <span>ACTIVE WARNINGS</span>
              <h3>Warning Console</h3>
            </div>
            <DataTag type="DERIVED" />
          </header>

          <div className="warning-console">
            {warnings.length === 0 ? (
              <div className="warning-empty">
                <strong>NOMINAL</strong>
                <span>No active warnings.</span>
              </div>
            ) : (
              warnings.map((warning, index) => (
                <div className="warning-row" key={`${warning}-${index}`}>
                  <span>WARN</span>
                  <p>{warning}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
};

const MissionConfig = () => {
  const { mockMode, dataRateHz, systemStatus, connected } = useTelemetryStore();

  const activeMode = !connected
    ? 'OFFLINE / WAITING'
    : mockMode
      ? 'MOCK / SIMULATION'
      : 'LIVE TELEMETRY';

  const activeProfile = !connected
    ? 'no active telemetry link'
    : mockMode
      ? 'demo / original supported'
      : 'external telemetry source';

  const activeModeTag = !connected ? 'DERIVED' : mockMode ? 'SIMULATED' : 'REAL';
  const profileTag = !connected ? 'DERIVED' : mockMode ? 'SIMULATED' : 'REAL';

  return (
    <section className="aero-page config-page">
      <div className="aero-page-title config-title">
        <div>
          <span>SYSTEM CONFIGURATION // CAN-7USAT</span>
          <h2>Mission Configuration</h2>
        </div>
        <div className="config-status-box">
          <span>ACTIVE MODE</span>
          <strong>{activeMode}</strong>
        </div>
      </div>

      <div className="config-summary-grid">
        <div className="config-card">
          <span>MISSION</span>
          <strong>CAN-7USAT</strong>
          <DataTag type="REAL" />
        </div>

        <div className="config-card">
          <span>FRONTEND STACK</span>
          <strong>React + Vite</strong>
          <DataTag type="REAL" />
        </div>

        <div className="config-card">
          <span>BACKEND STACK</span>
          <strong>FastAPI + WebSocket</strong>
          <DataTag type="REAL" />
        </div>

        <div className="config-card">
          <span>DATA RATE</span>
          <strong>{dataRateHz || 10} <em>Hz</em></strong>
          <DataTag type={activeModeTag} />
        </div>
      </div>

      <div className="config-grid">
        <section className="config-panel">
          <header>
            <div>
              <span>RUNTIME ENDPOINTS</span>
              <h3>Interface Map</h3>
            </div>
            <DataTag type="REAL" />
          </header>

          <div className="config-table">
            <div><span>API_URL</span><strong>{API_URL}</strong><DataTag type="REAL" /></div>
            <div><span>WS_URL</span><strong>{WS_URL}</strong><DataTag type="REAL" /></div>
            <div><span>STATUS_ENDPOINT</span><strong>/api/status</strong><DataTag type="REAL" /></div>
            <div><span>HISTORY_ENDPOINT</span><strong>/api/telemetry/history</strong><DataTag type="REAL" /></div>
            <div><span>COMMAND_ENDPOINT</span><strong>/api/command</strong><DataTag type="REAL" /></div>
            <div><span>MOCK_RESET_ENDPOINT</span><strong>/api/mock/reset?profile=demo</strong><DataTag type="SIMULATED" /></div>
            <div><span>WEBSOCKET_CLIENTS</span><strong>{systemStatus?.websocket_clients ?? 0}</strong><DataTag type="REAL" /></div>
            <div><span>BACKEND_UPTIME</span><strong>{formatDuration(systemStatus?.uptime_seconds ?? 0)}</strong><DataTag type="REAL" /></div>
          </div>
        </section>

        <section className="config-panel">
          <header>
            <div>
              <span>MOCK PROFILE</span>
              <h3>Demo Runtime</h3>
            </div>
            <DataTag type="SIMULATED" />
          </header>

          <div className="config-table">
            <div><span>ACTIVE_PROFILE</span><strong>{activeProfile}</strong><DataTag type={profileTag} /></div>
            <div><span>RESET_BEHAVIOR</span><strong>Restart mission from T+0</strong><DataTag type="SIMULATED" /></div>
            <div><span>DEMO_SEQUENCE</span><strong>PRE_FLIGHT → BOOST → COAST → APOGEE → DESCENT → LANDED</strong><DataTag type="SIMULATED" /></div>
            <div><span>COMMAND_SAFETY</span><strong>confirmation gated</strong><DataTag type="DERIVED" /></div>
            <div><span>MISSION_CLOCK</span><strong>timestamp_ms / 1000</strong><DataTag type="REAL" /></div>
          </div>
        </section>
      </div>

      <section className="config-panel">
        <header>
          <div>
            <span>DATA SOURCE TRUTH TABLE</span>
            <h3>Real / Derived / Simulated Signals</h3>
          </div>
          <DataTag type="DERIVED" />
        </header>

        <div className="truth-table">
          <div className="truth-row truth-head">
            <span>SIGNAL</span>
            <span>SOURCE</span>
            <span>DESCRIPTION</span>
            <span>TAG</span>
          </div>

          <div className="truth-row">
            <span>altitude_m</span>
            <strong>Backend packet</strong>
            <p>Primary altitude field received from telemetry stream.</p>
            <DataTag type="REAL" />
          </div>

          <div className="truth-row">
            <span>velocity_ms</span>
            <strong>Backend packet</strong>
            <p>Vertical velocity field received from telemetry stream.</p>
            <DataTag type="REAL" />
          </div>

          <div className="truth-row">
            <span>quat_w / quat_x / quat_y / quat_z</span>
            <strong>Backend packet</strong>
            <p>Quaternion attitude values used for attitude visualizer and Euler conversion.</p>
            <DataTag type="REAL" />
          </div>

          <div className="truth-row">
            <span>roll / pitch / yaw</span>
            <strong>Frontend calculation</strong>
            <p>Euler angles derived from quaternion packet values.</p>
            <DataTag type="DERIVED" />
          </div>

          <div className="truth-row">
            <span>derived_acceleration</span>
            <strong>Frontend calculation</strong>
            <p>Filtered derivative of vertical velocity over a short time window.</p>
            <DataTag type="DERIVED" />
          </div>

          <div className="truth-row">
            <span>packet_rate / packet_loss</span>
            <strong>Frontend + backend status</strong>
            <p>Operational health indicators derived from packet timing and decoder status.</p>
            <DataTag type="DERIVED" />
          </div>

          <div className="truth-row">
            <span>gps_lat / gps_lon</span>
            <strong>Backend packet</strong>
            <p>Position fields carried by telemetry packets.</p>
            <DataTag type="REAL" />
          </div>

          <div className="truth-row">
            <span>mock flight profile</span>
            <strong>Backend simulation</strong>
            <p>Demo profile used for repeatable UI testing and mission demonstration.</p>
            <DataTag type="SIMULATED" />
          </div>
        </div>
      </section>

      <section className="config-panel">
        <header>
          <div>
            <span>FLIGHT STATE MODEL</span>
            <h3>Backend State Names</h3>
          </div>
          <DataTag type="REAL" />
        </header>

        <div className="config-state-strip">
          {['PRE_FLIGHT', 'BOOST', 'COAST', 'APOGEE', 'DESCENT', 'LANDED'].map((state, index, states) => (
            <div key={state}>
              <strong>{state.replaceAll('_', '-')}</strong>
              {index < states.length - 1 ? <span>→</span> : null}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};

export const AppShell = () => {
  const [activePage, setActivePage] = useState<PageKey>('mission');

  const {
    connected,
    mockMode,
    packetRateHz,
    packetLossPercent,
    latestPacket,
    systemStatus,
  } = useTelemetryStore();

  const pageTitle = pages.find((page) => page.key === activePage)?.label ?? 'Mission Control';

  const nonMissionContent = useMemo(() => {
    if (activePage === 'telemetry') return <EngineeringTelemetry />;
    if (activePage === 'analysis') return <FlightAnalysis />;
    if (activePage === 'logs') return <SystemLogs />;
    if (activePage === 'config') return <MissionConfig />;
    return null;
  }, [activePage]);

  return (
    <div className="aero-shell">
      <aside className="aero-sidebar">
        <div className="aero-logo">
          <span>GROUND CONTROL STATION</span>
          <strong>GARI GCS</strong>
        </div>

        <nav className="aero-nav">
          {pages.map((page) => (
            <button
              key={page.key}
              className={activePage === page.key ? 'active' : ''}
              onClick={() => setActivePage(page.key)}
            >
              <span>{page.code}</span>
              <strong>{page.label}</strong>
            </button>
          ))}
        </nav>

        <div className="aero-sidebar-footer">
          <span>UPLINK MODE</span>
          <strong>{mockMode ? 'SIMULATION' : 'LIVE LINK'}</strong>
        </div>
      </aside>

      <section className="aero-workspace">
        <header className="aero-topbar">
          <div>
            <span>CAN-7USAT // GARI GCS</span>
            <h1>{pageTitle}</h1>
          </div>

          <div className="aero-top-status">
            <div className={connected ? 'ok' : 'bad'}>
              <span>LINK</span>
              <strong>{connected ? 'ONLINE' : 'OFFLINE'}</strong>
            </div>
            <div>
              <span>STATE</span>
              <strong>{stateLabel(latestPacket?.flight_state_name)}</strong>
            </div>
            <div>
              <span>RATE</span>
              <strong>{packetRateHz} Hz</strong>
            </div>
            <div>
              <span>LOSS</span>
              <strong>{packetLossPercent.toFixed(1)}%</strong>
            </div>
            <div>
              <span>UPTIME</span>
              <strong>{formatDuration(systemStatus?.uptime_seconds ?? 0)}</strong>
            </div>
          </div>
        </header>

        <main className="aero-content">
          <div className={activePage === 'mission' ? 'aero-page-host active' : 'aero-page-host hidden'}>
            <Dashboard />
          </div>

          {activePage !== 'mission' && nonMissionContent}
        </main>
      </section>
    </div>
  );
};








