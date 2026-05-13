import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '../data';
import type { PlayerTrendPoint } from '../utils/playerTrend';
import { formatCredits, formatPercent, formatSignedCredits, formatSignedPercent } from '../utils/format';

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
  if (data.length === 0) {
    return (
      <div className={`trend-empty ${mode === 'mini' ? 'trend-empty-mini' : ''}`}>
        Trend non disponibile
      </div>
    );
  }

  const compact = mode === 'mini';
  const positive = data[data.length - 1].quote >= data[0].quote;
  const stroke = positive ? 'var(--green)' : 'var(--red)';

  return (
    <div className={compact ? 'trend-chart-mini' : 'trend-chart-full'}>
      <ResponsiveContainer width="100%" height={compact ? 74 : 280}>
        <LineChart data={data} margin={compact ? { top: 8, right: 8, bottom: 0, left: 8 } : { top: 8, right: 18, bottom: 8, left: 0 }}>
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
            strokeWidth={compact ? 2 : 2.5}
            dot={compact ? false : <TrendDot />}
            activeDot={{ r: compact ? 3 : 5 }}
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
