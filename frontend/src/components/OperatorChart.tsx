interface OperatorChartProps {
  data: Array<{ time: number; value: number }>;
  label: string;
  unit: string;
}

const MAX_POINTS = 600;

const formatValue = (value: number, unit: string) => {
  const abs = Math.abs(value);

  if (!Number.isFinite(value)) return `N/A ${unit}`;
  if (abs >= 1000) return `${value.toFixed(0)} ${unit}`;
  if (abs >= 100) return `${value.toFixed(1)} ${unit}`;
  if (abs >= 10) return `${value.toFixed(2)} ${unit}`;
  return `${value.toFixed(3)} ${unit}`;
};

const formatAxis = (value: number) => {
  const abs = Math.abs(value);

  if (!Number.isFinite(value)) return 'N/A';
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const movingAverage = (points: Array<{ time: number; value: number }>, radius = 2) => {
  return points.map((point, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(points.length, index + radius + 1);
    const slice = points.slice(start, end);
    return {
      time: point.time,
      value: average(slice.map((item) => item.value)),
    };
  });
};

const downsample = (points: Array<{ time: number; value: number }>) => {
  if (points.length <= MAX_POINTS) return points;
  const step = Math.ceil(points.length / MAX_POINTS);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
};

const focusFlightWindow = (points: Array<{ time: number; value: number }>, unit: string) => {
  if (points.length < 12) return points;

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.abs(max - min);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)));

  const isAcceleration = unit.toLowerCase().includes('m/s2') || unit.toLowerCase().includes('m/s²');
  const threshold = isAcceleration
    ? Math.max(0.02, range * 0.015, maxAbs * 0.01)
    : Math.max(0.05, range * 0.02, maxAbs * 0.015);

  const activeIndexes = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => Math.abs(point.value) > threshold)
    .map(({ index }) => index);

  if (activeIndexes.length < 2) {
    return points.slice(-500);
  }

  const first = Math.max(0, activeIndexes[0] - 22);
  const last = Math.min(points.length - 1, activeIndexes[activeIndexes.length - 1] + 28);

  return points.slice(first, last + 1);
};

const rangeWithPadding = (min: number, max: number, unit: string) => {
  const isAcceleration = unit.toLowerCase().includes('m/s2') || unit.toLowerCase().includes('m/s²');

  let low = min;
  let high = max;

  if (isAcceleration) {
    low = Math.min(low, -0.5);
    high = Math.max(high, 0.5);
  } else {
    low = Math.min(low, 0);
    high = Math.max(high, 1);
  }

  if (Math.abs(high - low) < 0.001) {
    const padding = Math.max(Math.abs(high) * 0.1, isAcceleration ? 0.5 : 1);
    return { min: low - padding, max: high + padding };
  }

  const padding = Math.max((high - low) * 0.14, isAcceleration ? 0.2 : 1);
  return { min: low - padding, max: high + padding };
};

const smoothPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 2) return '';

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
};

export const OperatorChart = ({ data, label, unit }: OperatorChartProps) => {
  const clean = data.filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value));
  const focused = focusFlightWindow(clean, unit);
  const smoothed = movingAverage(downsample(focused), unit.includes('m/s2') ? 3 : 2);

  if (smoothed.length < 2) {
    return (
      <div className="op-chart op-empty">
        <div>WAITING FOR {label.toUpperCase()} TELEMETRY</div>
      </div>
    );
  }

  const values = smoothed.map((point) => point.value);
  const latest = clean.at(-1)?.value ?? smoothed.at(-1)?.value ?? 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = average(values);
  const range = max - min;

  const firstTime = smoothed[0].time;
  const lastTime = smoothed.at(-1)?.time ?? firstTime + 1;
  const duration = Math.max(lastTime - firstTime, 1);

  const yRange = rangeWithPadding(min, max, unit);
  const ySpan = Math.max(yRange.max - yRange.min, 1);

  const peak = smoothed.reduce(
    (best, point) => Math.abs(point.value) > Math.abs(best.value) ? point : best,
    smoothed[0],
  );

  const width = 1200;
  const height = 360;
  const padLeft = 20;
  const padRight = 24;
  const padTop = 18;
  const padBottom = 22;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const toX = (time: number) => padLeft + ((time - firstTime) / duration) * plotWidth;
  const toY = (value: number) => padTop + (1 - (value - yRange.min) / ySpan) * plotHeight;

  const plotPoints = smoothed.map((point) => ({
    x: toX(point.time),
    y: toY(point.value),
  }));

  const linePath = smoothPath(plotPoints);
  const baselineY = padTop + plotHeight;
  const areaPath = `${linePath} L ${plotPoints.at(-1)?.x.toFixed(1)} ${baselineY.toFixed(1)} L ${plotPoints[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = yRange.max - ratio * ySpan;
    return {
      value,
      y: padTop + ratio * plotHeight,
    };
  });

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = firstTime + ratio * duration;
    return {
      value,
      x: padLeft + ratio * plotWidth,
    };
  });

  const zeroY = yRange.min <= 0 && yRange.max >= 0 ? toY(0) : null;

  return (
    <div className="op-chart">
      <div className="op-chart-title">
        <div>
          <span>LIVE CHANNEL</span>
          <strong>{label}</strong>
        </div>
        <em>{unit} · smoothed · T+ window</em>
      </div>

      <div className="op-chart-stats">
        <div><span>CURRENT</span><strong>{formatValue(latest, unit)}</strong></div>
        <div><span>MAX</span><strong>{formatValue(max, unit)}</strong></div>
        <div><span>MIN</span><strong>{formatValue(min, unit)}</strong></div>
        <div><span>AVG</span><strong>{formatValue(avg, unit)}</strong></div>
        <div><span>RANGE</span><strong>{formatValue(range, unit)}</strong></div>
        <div><span>SAMPLES</span><strong>{smoothed.length}</strong></div>
      </div>

      <div className="op-chart-meta">
        <span>WINDOW T+{firstTime.toFixed(2)}s → T+{lastTime.toFixed(2)}s</span>
        <span>ΔT {duration.toFixed(2)}s</span>
        <span>PEAK {formatValue(peak.value, unit)} @ T+{peak.time.toFixed(2)}s</span>
      </div>

      <div className="op-chart-body">
        <div className="op-y-axis">
          {yTicks.map((tick) => (
            <span key={tick.y}>{formatAxis(tick.value)} <em>{unit}</em></span>
          ))}
        </div>

        <div className="op-plot">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <rect x="0" y="0" width={width} height={height} className="op-bg" />

            {yTicks.map((tick) => (
              <line key={`y-${tick.y}`} x1={padLeft} x2={padLeft + plotWidth} y1={tick.y} y2={tick.y} className="op-grid" />
            ))}

            {xTicks.map((tick) => (
              <line key={`x-${tick.x}`} x1={tick.x} x2={tick.x} y1={padTop} y2={padTop + plotHeight} className="op-grid op-grid-vertical" />
            ))}

            {zeroY !== null && (
              <line x1={padLeft} x2={padLeft + plotWidth} y1={zeroY} y2={zeroY} className="op-zero" />
            )}

            <path d={areaPath} className="op-area" />
            <path d={linePath} className="op-line" />
            <circle cx={plotPoints.at(-1)?.x ?? 0} cy={plotPoints.at(-1)?.y ?? 0} r="5" className="op-last-dot" />
          </svg>

          <div className="op-x-axis">
            {xTicks.map((tick) => (
              <span key={tick.x}>T+{tick.value.toFixed(1)}s</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


