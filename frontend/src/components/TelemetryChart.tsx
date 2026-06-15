interface TelemetryChartProps {
  data: Array<{ time: number; value: number }>;
  title?: string;
  color?: string;
  unit: string;
  height?: number;
  variant?: 'compact' | 'detailed';
}

const MAX_RENDER_POINTS = 900;

const downsample = (points: Array<{ time: number; value: number }>) => {
  if (points.length <= MAX_RENDER_POINTS) return points;

  const step = Math.ceil(points.length / MAX_RENDER_POINTS);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
};

const focusActiveFlightWindow = (points: Array<{ time: number; value: number }>) => {
  if (points.length < 12) return points;

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.abs(max - min);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)));

  const threshold = Math.max(0.05, range * 0.02, maxAbs * 0.015);

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

const formatValue = (value: number, unit: string, digits?: number) => {
  const abs = Math.abs(value);

  if (!Number.isFinite(value)) return `N/A ${unit}`;
  if (typeof digits === 'number') return `${value.toFixed(digits)} ${unit}`;
  if (abs >= 1000) return `${value.toFixed(0)} ${unit}`;
  if (abs >= 100) return `${value.toFixed(1)} ${unit}`;
  if (abs >= 10) return `${value.toFixed(2)} ${unit}`;
  return `${value.toFixed(2)} ${unit}`;
};

const formatAxisValue = (value: number) => {
  const abs = Math.abs(value);

  if (!Number.isFinite(value)) return 'N/A';
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const clampRange = (min: number, max: number) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: -1, max: 1 };
  }

  if (Math.abs(max - min) < 0.001) {
    const padding = Math.max(Math.abs(max) * 0.1, 1);
    return { min: min - padding, max: max + padding };
  }

  const padding = Math.max((max - min) * 0.16, 1);
  return { min: min - padding, max: max + padding };
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

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const TelemetryChart = ({
  data,
  color = '#f5f5f5',
  unit,
  variant = 'detailed',
}: TelemetryChartProps) => {
  const rawCleanData = data.filter(
    (point) =>
      Number.isFinite(point.time) &&
      Number.isFinite(point.value),
  );

  const windowedData = focusActiveFlightWindow(rawCleanData);
  const cleanData = downsample(windowedData);
  const hasData = cleanData.length >= 2;

  const latest = rawCleanData.at(-1)?.value ?? cleanData.at(-1)?.value ?? 0;
  const visibleValues = cleanData.map((point) => point.value);

  const visibleMin = hasData ? Math.min(...visibleValues) : 0;
  const visibleMax = hasData ? Math.max(...visibleValues) : 0;
  const visibleAvg = hasData ? average(visibleValues) : 0;
  const visibleRange = visibleMax - visibleMin;

  const firstTime = cleanData[0]?.time ?? 0;
  const lastTime = cleanData.at(-1)?.time ?? firstTime + 1;
  const timeWindow = Math.max(lastTime - firstTime, 0);

  const peakPoint = cleanData.reduce(
    (best, point) => (Math.abs(point.value) > Math.abs(best.value) ? point : best),
    cleanData[0] ?? { time: 0, value: 0 },
  );

  const rawMin = Math.min(...visibleValues, 0);
  const rawMax = Math.max(...visibleValues, 1);
  const yRange = clampRange(rawMin, rawMax);

  const xRange = Math.max(lastTime - firstTime, 1);
  const ySpan = Math.max(yRange.max - yRange.min, 1);

  const width = 1200;
  const height = variant === 'compact' ? 330 : 360;
  const padLeft = 18;
  const padRight = 22;
  const padTop = 18;
  const padBottom = 20;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const toX = (time: number) => padLeft + ((time - firstTime) / xRange) * plotWidth;
  const toY = (value: number) => padTop + (1 - (value - yRange.min) / ySpan) * plotHeight;

  const plotPoints = cleanData.map((point) => ({
    x: toX(point.time),
    y: toY(point.value),
  }));

  const linePath = hasData ? smoothPath(plotPoints) : '';
  const baselineY = padTop + plotHeight;

  const areaPath = hasData
    ? `${linePath} L ${plotPoints.at(-1)?.x.toFixed(1)} ${baselineY.toFixed(1)} L ${plotPoints[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`
    : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = yRange.max - ratio * ySpan;
    return {
      value,
      y: padTop + ratio * plotHeight,
    };
  });

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = firstTime + ratio * xRange;
    return {
      value,
      x: padLeft + ratio * plotWidth,
    };
  });

  const zeroY = yRange.min <= 0 && yRange.max >= 0 ? toY(0) : null;

  if (!hasData) {
    return (
      <div className={`numeric-engineering-chart ${variant} empty`}>
        <div className="chart-empty-state">WAITING FOR TELEMETRY</div>
      </div>
    );
  }

  return (
    <div className={`numeric-engineering-chart ${variant}`}>
      <div className="numeric-chart-top">
        <div>
          <span>CURRENT</span>
          <strong>{formatValue(latest, unit)}</strong>
        </div>
        <div>
          <span>MAX</span>
          <strong>{formatValue(visibleMax, unit)}</strong>
        </div>
        <div>
          <span>MIN</span>
          <strong>{formatValue(visibleMin, unit)}</strong>
        </div>
        <div>
          <span>AVG</span>
          <strong>{formatValue(visibleAvg, unit)}</strong>
        </div>
        <div>
          <span>RANGE</span>
          <strong>{formatValue(visibleRange, unit)}</strong>
        </div>
        <div>
          <span>SAMPLES</span>
          <strong>{cleanData.length}</strong>
        </div>
      </div>

      <div className="numeric-chart-meta">
        <span>WINDOW {firstTime.toFixed(2)}s → {lastTime.toFixed(2)}s</span>
        <span>ΔT {timeWindow.toFixed(2)}s</span>
        <span>PEAK {formatValue(peakPoint.value, unit)} @ T+{peakPoint.time.toFixed(2)}s</span>
      </div>

      <div className="numeric-chart-body">
        <div className="numeric-y-axis">
          {yTicks.map((tick) => (
            <span key={tick.y}>{formatAxisValue(tick.value)} <em>{unit}</em></span>
          ))}
        </div>

        <div className="numeric-plot-shell">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
            <rect x="0" y="0" width={width} height={height} className="chart-bg" />

            {yTicks.map((tick) => (
              <line
                key={`y-${tick.y}`}
                x1={padLeft}
                x2={padLeft + plotWidth}
                y1={tick.y}
                y2={tick.y}
                className="chart-grid-line"
              />
            ))}

            {xTicks.map((tick) => (
              <line
                key={`x-${tick.x}`}
                x1={tick.x}
                x2={tick.x}
                y1={padTop}
                y2={padTop + plotHeight}
                className="chart-grid-line vertical"
              />
            ))}

            {zeroY !== null && (
              <line
                x1={padLeft}
                x2={padLeft + plotWidth}
                y1={zeroY}
                y2={zeroY}
                className="chart-zero-line"
              />
            )}

            <path d={areaPath} className="chart-area-fill" />

            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={variant === 'compact' ? '3.5' : '4'}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="chart-main-line"
            />

            <circle
              cx={plotPoints.at(-1)?.x ?? 0}
              cy={plotPoints.at(-1)?.y ?? 0}
              r={variant === 'compact' ? '4.5' : '5.5'}
              fill={color}
              stroke="#050505"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="numeric-x-axis">
            {xTicks.map((tick) => (
              <span key={tick.x}>T+{tick.value.toFixed(1)}s</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
