import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import { useTelemetryStore } from '../stores/telemetryStore';
import { OperatorChart } from './OperatorChart';
import { Rocket3D } from './Rocket3D';
import { GPSMap } from './GPSMap';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const WS_URL  = import.meta.env.VITE_WS_URL  ?? 'ws://localhost:8000/ws/telemetry';

const FLIGHT_STATES = ['PRE_FLIGHT', 'BOOST', 'COAST', 'APOGEE', 'DESCENT', 'LANDED'];

const stateLabel = (s?: string | null) => s ? s.replaceAll('_', '-') : 'NO DATA';

const fmt = (v: number, d = 1) => Number.isFinite(v) ? v.toFixed(d) : 'N/A';

const formatDuration = (s: number) => {
  const ss = Math.max(0, Math.floor(s));
  return [Math.floor(ss / 3600), Math.floor((ss % 3600) / 60), ss % 60]
    .map((p) => String(p).padStart(2, '0')).join(':');
};

const quaternionToEuler = (w: number, x: number, y: number, z: number) => {
  const roll  = Math.atan2(2*(w*x+y*z), 1-2*(x*x+y*y));
  const sinp  = 2*(w*y-z*x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp)*Math.PI/2 : Math.asin(sinp);
  const yaw   = Math.atan2(2*(w*z+x*y), 1-2*(y*y+z*z));
  return { roll: roll*180/Math.PI, pitch: pitch*180/Math.PI, yaw: yaw*180/Math.PI };
};

const isGpsValid = (lat?: number, lon?: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) &&
  Math.abs(lat ?? 0) > 0.000001 && Math.abs(lon ?? 0) > 0.000001;

// Battery colour: green → yellow → red
const batteryColor = (pct: number) =>
  pct > 60 ? '#86efac' : pct > 30 ? '#fde047' : '#fca5a5';

// Signal quality label
const signalQuality = (dbm: number) => {
  if (dbm >= -60) return 'EXCELLENT';
  if (dbm >= -70) return 'GOOD';
  if (dbm >= -80) return 'FAIR';
  return 'POOR';
};

type ConfirmCommand = { command: string; title: string; body: string; danger?: boolean } | null;

const CommandButton = ({
  label, onClick, disabled, danger, warning, active,
}: {
  label: string; onClick: () => void;
  disabled?: boolean; danger?: boolean; warning?: boolean; active?: boolean;
}) => (
  <button
    className={['command-button', danger?'danger':'', warning?'warning':'', active?'active':''].join(' ')}
    disabled={disabled}
    onClick={onClick}
  >
    {label}
  </button>
);

export const Dashboard = () => {
  const {
    connected, mockMode, latestPacket, systemStatus,
    altitudeHistory, velocityHistory, accelerationHistory,
    temperatureHistory, pressureHistory,
    packetRateHz, packetLossPercent, maxAltitude, maxVelocity,
    armed, events, warnings,
    connect, disconnect, fetchStatus, loadHistory,
    sendCommand, addEvent, clearEvents,
  } = useTelemetryStore();

  const [confirmCommand, setConfirmCommand] = useState<ConfirmCommand>(null);
  const [commandBusy, setCommandBusy] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    connect(WS_URL);
    fetchStatus();
    const t = window.setInterval(() => fetchStatus(), 1000);
    return () => { window.clearInterval(t); disconnect(); };
  }, [connect, disconnect, fetchStatus, loadHistory]);

  const flightState   = latestPacket?.flight_state_name ?? 'NO_DATA';
  const flightSeconds = latestPacket ? latestPacket.timestamp_ms / 1000 : 0;
  const gpsValid      = isGpsValid(latestPacket?.gps_lat, latestPacket?.gps_lon);

  const euler = useMemo(() => {
    if (!latestPacket) return { roll: 0, pitch: 0, yaw: 0 };
    return quaternionToEuler(latestPacket.quat_w, latestPacket.quat_x, latestPacket.quat_y, latestPacket.quat_z);
  }, [latestPacket]);

  const recoveryStatus = useMemo(() => {
    const ci = FLIGHT_STATES.indexOf(flightState);
    const ai = FLIGHT_STATES.indexOf('APOGEE');
    const di = FLIGHT_STATES.indexOf('DESCENT');
    const li = FLIGHT_STATES.indexOf('LANDED');
    return {
      recovery: ci >= li ? 'COMPLETE' : ci >= ai ? 'ACTIVE' : 'STANDBY',
      drogue:   ci >= ai ? 'DEPLOYED' : 'STANDBY',
      main:     ci >= di ? 'DEPLOYED' : 'STANDBY',
    };
  }, [flightState]);

  const canSendCommands   = connected && !commandBusy;
  const manualDeployLocked = !armed || !connected || Boolean(commandBusy);

  const runCommand = async (command: string) => {
    try {
      setCommandBusy(command);
      await sendCommand(command);
    } catch (e) {
      console.error(e);
      addEvent(`Command failed locally: ${command}`, 'danger');
    } finally {
      setCommandBusy(null);
      setConfirmCommand(null);
    }
  };

  const requestCommand = (command: string) => {
    const safetyGated = ['ARM', 'MANUAL_DEPLOY', 'ABORT', 'RESET'];
    if (!safetyGated.includes(command)) { runCommand(command); return; }

    const dialogs: Record<string, { title: string; body: string; danger?: boolean }> = {
      ARM:          { title: 'ARM VEHICLE', body: 'Places GCS in ARMED command mode. Manual deploy becomes available.', danger: true },
      MANUAL_DEPLOY:{ title: 'MANUAL DEPLOY', body: 'Send manual parachute deploy. Confirm vehicle is armed.', danger: true },
      ABORT:        { title: 'ABORT MISSION', body: 'Sends abort command and returns to SAFE mode.', danger: true },
      RESET:        { title: 'RESET SESSION', body: 'Restarts mock mission from T+0 and clears local history.', danger: false },
    };
    setConfirmCommand({ command, ...dialogs[command] });
  };

  // Extended telemetry values with fallbacks
  const temperature = latestPacket?.temperature_c ?? 25.0;
  const pressure    = latestPacket?.pressure_pa   ?? 101325.0;
  const battery     = latestPacket?.battery_pct   ?? 100.0;
  const signalDbm   = latestPacket?.signal_dbm    ?? -70.0;

  return (
    <div className="mission-shell">
      {/* ── TOPBAR ── */}
      <header className="mission-topbar">
        <div className="mission-brand">
          <div className="mission-mark">CAN</div>
          <div>
            <h1>GARI GCS · CAN-7USAT Mission Control</h1>
            <p>Dual-Vehicle Ground Control · FastAPI WebSocket · 915 MHz CanSat · 868 MHz Rocket</p>
          </div>
        </div>

        <div className="mission-metrics">
          <div className={`metric-pill ${connected ? 'good' : 'bad'}`}>
            <span>Telemetry</span>
            <strong>{connected ? 'CONNECTED' : 'DISCONNECTED'}</strong>
          </div>
          <div className="metric-pill">
            <span>Mission Timer</span>
            <strong>{formatDuration(flightSeconds)}</strong>
          </div>
          <div className="metric-pill">
            <span>Rate</span>
            <strong>{packetRateHz} Hz</strong>
          </div>
          <div className="metric-pill">
            <span>Packet Loss</span>
            <strong>{packetLossPercent.toFixed(1)}%</strong>
          </div>
          <div className="metric-pill">
            <span>Battery</span>
            <strong style={{ color: batteryColor(battery) }}>{fmt(battery, 0)}%</strong>
          </div>
          <div className={`metric-pill ${mockMode ? 'warn' : 'good'}`}>
            <span>Mode</span>
            <strong>{mockMode ? 'MOCK' : 'LIVE'}</strong>
          </div>
        </div>
      </header>

      <main className="mission-main">
        {/* ── LEFT COLUMN ── */}
        <section className="mission-column left-column">

          {/* Flight State Timeline */}
          <div className="panel timeline-panel">
            <div className="panel-header">Flight State Timeline</div>
            <div className="panel-body">
              <div className="current-state">{stateLabel(flightState)}</div>
              <div className="state-list">
                {FLIGHT_STATES.map((state) => {
                  const ci = FLIGHT_STATES.indexOf(flightState);
                  const si = FLIGHT_STATES.indexOf(state);
                  return (
                    <div
                      key={state}
                      className={`state-step ${ci >= si && ci !== -1 ? 'complete' : ''} ${flightState === state ? 'active' : ''}`}
                    >
                      <span />{stateLabel(state)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vehicle Status */}
          <div className={`panel arm-panel ${armed ? 'armed' : 'safe'}`}>
            <div className="panel-header">Arm / Safe + Recovery</div>
            <div className="panel-body">
              <div className="status-grid">
                <div className="status-cell">
                  <span>Vehicle</span>
                  <strong className={armed ? 'danger-text' : 'good-text'}>{armed ? 'ARMED' : 'SAFE'}</strong>
                </div>
                <div className="status-cell">
                  <span>Recovery</span>
                  <strong>{recoveryStatus.recovery}</strong>
                </div>
                <div className="status-cell">
                  <span>Drogue</span>
                  <strong>{recoveryStatus.drogue}</strong>
                </div>
                <div className="status-cell">
                  <span>Main</span>
                  <strong>{recoveryStatus.main}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Command Panel */}
          <div className="panel command-panel">
            <div className="panel-header">
              Command Panel
              <span className={`command-lock ${armed ? 'armed' : 'safe'}`}>
                {armed ? 'ARMED' : 'SAFE LOCK'}
              </span>
            </div>
            <div className="panel-body">
              {!connected && (
                <div className="command-note danger-note">Commands disabled: link disconnected.</div>
              )}
              {commandBusy && (
                <div className="command-note">Sending command: {commandBusy}</div>
              )}
              {!armed
                ? <CommandButton label="ARM VEHICLE" danger disabled={!canSendCommands} onClick={() => requestCommand('ARM')} />
                : <CommandButton label="DISARM VEHICLE" active disabled={!canSendCommands} onClick={() => requestCommand('DISARM')} />
              }
              <CommandButton label={armed ? 'MANUAL DEPLOY' : 'MANUAL DEPLOY LOCKED'} warning disabled={manualDeployLocked} onClick={() => requestCommand('MANUAL_DEPLOY')} />
              <CommandButton label="ABORT" danger disabled={!canSendCommands} onClick={() => requestCommand('ABORT')} />
              <CommandButton label="RESET SESSION" disabled={!canSendCommands} onClick={() => requestCommand('RESET')} />
            </div>
          </div>
        </section>

        {/* ── CENTER COLUMN ── */}
        <section className="mission-column center-column">

          {/* Primary telemetry cards — all 7 key values */}
          <div className="telemetry-card-grid">
            <div className="telemetry-card">
              <span>Altitude</span>
              <strong>{fmt(latestPacket?.altitude_m ?? 0)} m</strong>
            </div>
            <div className="telemetry-card">
              <span>Vertical Velocity</span>
              <strong>{fmt(latestPacket?.velocity_ms ?? 0)} m/s</strong>
            </div>
            <div className="telemetry-card">
              <span>Temperature</span>
              <strong>{fmt(temperature, 1)} °C</strong>
            </div>
            <div className="telemetry-card">
              <span>Pressure</span>
              <strong>{fmt(pressure, 0)} Pa</strong>
            </div>
            <div className="telemetry-card">
              <span>Signal Strength</span>
              <strong>{fmt(signalDbm, 0)} dBm</strong>
            </div>
            <div className="telemetry-card">
              <span>Battery</span>
              <strong style={{ color: batteryColor(battery) }}>{fmt(battery, 0)} %</strong>
            </div>
            <div className="telemetry-card">
              <span>Mission Timer</span>
              <strong>{formatDuration(flightSeconds)}</strong>
            </div>
            <div className="telemetry-card">
              <span>Max Altitude</span>
              <strong>{fmt(maxAltitude)} m</strong>
            </div>
            <div className="telemetry-card">
              <span>Max Velocity</span>
              <strong>{fmt(maxVelocity)} m/s</strong>
            </div>
            {/* GPS coordinates inline */}
            <div className="telemetry-card gps-inline-card">
              <span>GPS Coordinates</span>
              <strong>
                {fmt(latestPacket?.gps_lat ?? 0, 5)}°N &nbsp;
                {fmt(latestPacket?.gps_lon ?? 0, 5)}°E
              </strong>
            </div>
          </div>

          {/* Charts: Altitude, Velocity, Acceleration */}
          <div className="chart-grid-console">
            <div className="panel chart-panel square-chart">
              <div className="panel-header">Altitude (m)</div>
              <div className="chart-body">
                <OperatorChart data={altitudeHistory} label="Altitude" unit="m" />
              </div>
            </div>

            <div className="panel chart-panel square-chart">
              <div className="panel-header">Velocity (m/s)</div>
              <div className="chart-body">
                <OperatorChart data={velocityHistory} label="Velocity" unit="m/s" />
              </div>
            </div>

            <div className="panel chart-panel square-chart">
              <div className="panel-header">Temperature (°C)</div>
              <div className="chart-body">
                <OperatorChart data={temperatureHistory} label="Temperature" unit="°C" />
              </div>
            </div>

            <div className="panel chart-panel square-chart">
              <div className="panel-header">Pressure (Pa)</div>
              <div className="chart-body">
                <OperatorChart data={pressureHistory} label="Pressure" unit="Pa" />
              </div>
            </div>

            <div className="panel chart-panel acceleration-wide">
              <div className="panel-header">Derived Vertical Acceleration (m/s²)</div>
              <div className="chart-body">
                <OperatorChart data={accelerationHistory} label="Derived Acceleration" unit="m/s2" />
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT COLUMN ── */}
        <section className="mission-column right-column">

          {/* 3-D Attitude Visualizer */}
          <div className="panel orientation-panel">
            <div className="panel-header">Attitude Visualizer</div>
            <div className="rocket-viewport">
              <Rocket3D
                quat_w={latestPacket?.quat_w ?? 1}
                quat_x={latestPacket?.quat_x ?? 0}
                quat_y={latestPacket?.quat_y ?? 0}
                quat_z={latestPacket?.quat_z ?? 0}
              />
            </div>
          </div>

          {/* Quaternion / Euler */}
          <div className="panel quaternion-panel">
            <div className="panel-header">Altitude · Velocity · Acceleration</div>
            <div className="quat-grid">
              <div><span>Alt</span><strong>{fmt(latestPacket?.altitude_m ?? 0)} m</strong></div>
              <div><span>Vel</span><strong>{fmt(latestPacket?.velocity_ms ?? 0)} m/s</strong></div>
              <div><span>Accel</span><strong>{fmt(accelerationHistory.at(-1)?.value ?? 0, 2)} m/s²</strong></div>
              <div><span>Roll</span><strong>{euler.roll.toFixed(1)}°</strong></div>
              <div><span>Pitch</span><strong>{euler.pitch.toFixed(1)}°</strong></div>
              <div><span>Yaw</span><strong>{euler.yaw.toFixed(1)}°</strong></div>
              <div><span>Max Alt</span><strong>{fmt(maxAltitude)} m</strong></div>
            </div>
          </div>

          {/* GPS + Launch Zone Map */}
          <div className="panel gps-panel">
            <div className="panel-header">Launch Zone Map</div>
            <div className="panel-body">
              <div className="gps-lines">
                <div>
                  <span>GPS Coordinates</span>
                  <strong className={gpsValid ? 'good-text' : 'warn-text'}>
                    {gpsValid ? 'VALID FIX' : 'WAITING'}
                  </strong>
                </div>
                <div>
                  <span>Latitude</span>
                  <strong>{fmt(latestPacket?.gps_lat ?? 0, 6)}°</strong>
                </div>
                <div>
                  <span>Longitude</span>
                  <strong>{fmt(latestPacket?.gps_lon ?? 0, 6)}°</strong>
                </div>
              </div>
              <GPSMap lat={latestPacket?.gps_lat ?? 0} lon={latestPacket?.gps_lon ?? 0} valid={gpsValid} />
            </div>
          </div>

          {/* System Diagnostics */}
          <div className="panel diagnostics-panel">
            <div className="panel-header">Diagnostics</div>
            <div className="diagnostic-list">
              <div><span>Backend</span>
                <strong className={systemStatus ? 'good-text' : 'warn-text'}>{systemStatus ? 'ONLINE' : 'WAIT'}</strong>
              </div>
              <div><span>Radio / WS</span>
                <strong className={connected ? 'good-text' : 'danger-text'}>{connected ? 'NOMINAL' : 'LOST'}</strong>
              </div>
              <div><span>Signal</span>
                <strong className={signalDbm >= -80 ? 'good-text' : 'warn-text'}>
                  {signalQuality(signalDbm)} ({fmt(signalDbm, 0)} dBm)
                </strong>
              </div>
              <div><span>Battery</span>
                <strong style={{ color: batteryColor(battery) }}>{fmt(battery, 0)}%</strong>
              </div>
              <div><span>GPS Fix</span>
                <strong className={gpsValid ? 'good-text' : 'warn-text'}>{gpsValid ? 'VALID' : 'WAIT'}</strong>
              </div>
              <div><span>Decoder</span>
                <strong className={(systemStatus?.packets_dropped ?? 0) > 0 ? 'warn-text' : 'good-text'}>
                  {(systemStatus?.packets_dropped ?? 0) > 0 ? 'DROPS' : 'CLEAN'}
                </strong>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── BOTTOM ── */}
      <footer className="mission-bottom">
        <div className="bottom-panel event-panel">
          <div className="bottom-header">
            <h3>Telemetry Logs</h3>
            <button className="clear-button" onClick={clearEvents}>Clear</button>
          </div>
          <div className="event-list">
            {events.length === 0
              ? <div className="empty-row">No events yet.</div>
              : events.map((e) => (
                  <div key={e.id} className={`event-row ${e.level}`}>
                    <span>{new Date(e.timestamp).toLocaleTimeString()}</span>
                    <strong>{e.message}</strong>
                  </div>
                ))
            }
          </div>
        </div>

        <div className="bottom-panel warning-panel">
          <div className="bottom-header">
            <h3>Warnings / Alerts</h3>
            <a className="export-button" href={`${API_URL}/api/export/csv`} target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
          <div className="warning-list">
            {warnings.length === 0
              ? <div className="empty-row good-text">No active warnings.</div>
              : warnings.map((w) => (
                  <div key={w} className="warning-row">⚠ {w}</div>
                ))
            }
          </div>
        </div>
      </footer>

      {/* ── CONFIRM DIALOG ── */}
      {confirmCommand && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className={`confirm-modal ${confirmCommand.danger ? 'danger' : ''}`}>
            <div className="confirm-kicker">
              {confirmCommand.danger ? 'SAFETY CONFIRMATION REQUIRED' : 'CONFIRM COMMAND'}
            </div>
            <h2>{confirmCommand.title}</h2>
            <p>{confirmCommand.body}</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" disabled={Boolean(commandBusy)} onClick={() => setConfirmCommand(null)}>
                Cancel
              </button>
              <button
                className={confirmCommand.danger ? 'confirm-danger' : 'confirm-send'}
                disabled={Boolean(commandBusy)}
                onClick={() => runCommand(confirmCommand.command)}
              >
                {commandBusy ? 'Sending...' : `Confirm ${confirmCommand.command}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
