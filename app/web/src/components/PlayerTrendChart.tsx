import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo, useState } from 'react';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '../data';
import type { PlayerTrendPoint } from '../utils/playerTrend';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type Props = {
  data: PlayerTrendPoint[];
  mode?: 'mini' | 'full';
  valueKey?: 'quote' | 'estimatedValue';
};

type TrendDotProps = {
  cx?: number;
  cy?: number;
  payload?: PlayerTrendPoint;
};

function TrendDot({ cx, cy, payload }: TrendDotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const color = payload.quoteChange > 0 ? 'var(--green)' : payload.quoteChange < 0 ? 'var(--red)' : 'var(--amber)';
  return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#0b0d12" strokeWidth={1.5} />;
}

function cleanMarkerPoints(data: PlayerTrendPoint[]) {
  if (data.length === 0) return new Set<number>();
  const first = data[0];
  const last = data[data.length - 1];
  const max = data.reduce((best, point) => point.quote > best.quote ? point : best, first);
  const min = data.reduce((best, point) => point.quote < best.quote ? point : best, first);
  return new Set(
    data
      .filter((point, index) =>
        point.round === first.round ||
        point.round === last.round ||
        point.round === max.round ||
        point.round === min.round ||
        (index > 0 && point.quote !== data[index - 1].quote),
      )
      .map(point => point.round),
  );
}

function DetailDot({ cx, cy, payload, markerRounds }: TrendDotProps & { markerRounds: Set<number> }) {
  if (!payload || !markerRounds.has(payload.round)) return null;
  return <TrendDot cx={cx} cy={cy} payload={payload} />;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PlayerTrendPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="trend-tooltip">
      <strong>Giornata {point.round}</strong>
      <span>Quotazione: {formatCredits(point.quote)}</span>
      <span>Variazione quota: {formatSignedCredits(point.quoteChange)}</span>
      <span>Rendimento stimato: {formatSignedPercent(point.fantaTradingReturnPct)}</span>
      <span>Valore stimato: {formatCredits(point.estimatedValue)}</span>
      <span>Voto: {point.vote ?? 'n.d.'}</span>
      <span>Bonus/malus: {formatSignedPercent(point.fantasyBonusPct ?? 0)}</span>
    </div>
  );
}

export default function PlayerTrendChart({ data, mode = 'full', valueKey = 'quote' }: Props) {
  const [range, setRange] = useState<'5' | '10' | 'all'>('all');
  const compact = mode === 'mini';
  const visibleData = useMemo(() => {
    if (compact || range === 'all') return data;
    return data.slice(-Number(range));
  }, [compact, data, range]);
  const markerRounds = useMemo(() => cleanMarkerPoints(visibleData), [visibleData]);

  if (data.length === 0) {
    return (
      <div className={`trend-empty ${mode === 'mini' ? 'trend-empty-mini' : ''}`}>
        Trend non disponibile
      </div>
    );
  }

  const positive = data[data.length - 1].quote >= data[0].quote;
  const stroke = positive ? 'var(--green)' : 'var(--red)';
  const totalChange = data[data.length - 1].quote - data[0].quote;
  const lastValue = data[data.length - 1][valueKey];

  return (
    <div className={compact ? 'trend-chart-mini' : 'trend-chart-full'}>
      {compact && (
        <div className="sparkline-summary">
          <span>
            <small>Ultima</small>
            <strong>{formatCredits(lastValue, valueKey === 'quote' ? 2 : 0)}</strong>
          </span>
          <span className={valueTone(totalChange)}>
            <small>Delta</small>
            {formatSignedCredits(totalChange)}
          </span>
        </div>
      )}
      {!compact && (
        <div className="trend-range-toggle">
          <button type="button" className={range === '5' ? 'active' : ''} onClick={() => setRange('5')}>Ultime 5</button>
          <button type="button" className={range === '10' ? 'active' : ''} onClick={() => setRange('10')}>Ultime 10</button>
          <button type="button" className={range === 'all' ? 'active' : ''} onClick={() => setRange('all')}>Stagione</button>
        </div>
      )}
      <ResponsiveContainer width="100%" height={compact ? 74 : 280}>
        <LineChart data={visibleData} margin={compact ? { top: 8, right: 8, bottom: 0, left: 8 } : { top: 8, right: 18, bottom: 8, left: 0 }}>
          {!compact && <CartesianGrid {...GRID_STYLE} />}
          <XAxis
            dataKey="round"
            hide={compact}
            tickFormatter={(value: number) => `G${value}`}
            {...AXIS_STYLE}
          />
          <YAxis
            hide={compact}
            tickFormatter={(value: number) => valueKey === 'quote' ? String(value) : formatCredits(value, 0)}
            {...AXIS_STYLE}
          />
          <Tooltip content={<TrendTooltip />} wrapperStyle={compact ? { display: 'none' } : undefined} {...TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey={valueKey}
            name={valueKey === 'quote' ? 'Quotazione' : 'Valore stimato'}
            stroke={stroke}
            strokeWidth={compact ? 2.25 : 3}
            dot={compact ? false : <DetailDot markerRounds={markerRounds} />}
            activeDot={{ r: compact ? 3 : 4.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {!compact && (
        <div className="trend-source-note">
          Andamento stimato nel pilot, non quotazione ufficiale Fantacalcio round-by-round.
        </div>
      )}
    </div>
  );
}
