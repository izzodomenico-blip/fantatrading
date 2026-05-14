import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE } from '../data';
import type { TeamTrendPoint } from '../utils/teamTrend';
import { formatCredits, formatSignedPercent } from '../utils/format';

type Props = {
  data: TeamTrendPoint[];
  valueKey?: 'totalValue' | 'portfolioValue' | 'roiPct' | 'teamVoteAverage';
  height?: number;
};

export default function TeamTrendChart({ data, valueKey = 'totalValue', height = 260 }: Props) {
  if (data.length === 0) {
    return <div className="trend-empty">Andamento squadra non disponibile</div>;
  }

  const isRoi = valueKey === 'roiPct';
  const isAverage = valueKey === 'teamVoteAverage';
  const label = isRoi ? 'ROI squadra' : isAverage ? 'Media squadra' : valueKey === 'portfolioValue' ? 'Valore rosa' : 'Valore squadra';

  return (
    <div className="team-trend-chart">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="round" tickFormatter={(value: number) => `G${value}`} {...AXIS_STYLE} />
          <YAxis
            tickFormatter={(value: number) => isRoi ? `${value}%` : isAverage ? value.toFixed(1) : formatCredits(value, 0)}
            {...AXIS_STYLE}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(value: number) => isRoi ? formatSignedPercent(value) : isAverage ? value.toFixed(2) : formatCredits(value)}
            labelFormatter={(label) => `Giornata ${label}`}
          />
          <Line
            type="monotone"
            dataKey={valueKey}
            name={label}
            stroke={isRoi ? COLORS.green : isAverage ? COLORS.amber : COLORS.blue}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
