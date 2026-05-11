import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Section, fmt, pct } from '../components';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE, profitability } from '../data';

const scenarios = profitability.scenarios;
const chartData = scenarios.map(s => ({
  n: s.numParticipants,
  'Montepremi': Math.round(s.avgPrizePool),
  'Ricavo Org.': Math.round(s.avgPlatformRevenue),
  'Premio 1°': Math.round(s.avgFirstPrize),
}));

const first = scenarios[0];
const last = scenarios[scenarios.length - 1];

export default function ScaleAnalysis() {
  return (
    <>
      <div className="page-title">Analisi per Scala</div>
      <div className="page-sub">Come le metriche economiche variano al crescere del numero di partecipanti (Fase 2)</div>

      <Section title="Montepremi e Ricavi vs N">
        <div className="card">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 16, left: 16 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="n" label={{ value: 'N partecipanti', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 12 }} height={44} {...AXIS_STYLE} />
                <YAxis yAxisId="left" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} {...AXIS_STYLE} label={{ value: 'Crediti', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v.toLocaleString('it-IT')} cr`} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
                <Line yAxisId="left" type="monotone" dataKey="Montepremi" stroke={COLORS.blue} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.blue }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="Ricavo Org." stroke={COLORS.green} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.green }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="Premio 1°" stroke={COLORS.amber} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.amber }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section title="Tabella Completa">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>N</th>
                <th>Montepremi</th>
                <th>Ricavo Org.</th>
                <th>Margine %</th>
                <th>Premio 1°</th>
                <th>ROI Vincitore</th>
                <th>Break-even</th>
                <th>Sostenibile</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map(s => (
                <tr key={s.numParticipants}>
                  <td><strong>{s.numParticipants}</strong></td>
                  <td>{s.avgPrizePool.toLocaleString('it-IT', { maximumFractionDigits: 0 })} cr</td>
                  <td>{s.avgPlatformRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })} cr</td>
                  <td>{pct(s.avgOrganizerMarginPct)}</td>
                  <td>{s.avgFirstPrize.toLocaleString('it-IT', { maximumFractionDigits: 0 })} cr</td>
                  <td>{fmt(s.avgWinnerROIPct, 0)}%</td>
                  <td>{pct(s.pctAbove0)}</td>
                  <td><span className={`badge badge-${s.isSustainable ? 'green' : 'red'}`}>{s.isSustainable ? 'SÌ' : 'NO'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Insight Chiave">
        <div className="three-col">
          <div className="card-sm">
            <div className="metric-label">Scala Montepremi</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.blue }}>
              {fmt(last.avgPrizePool / first.avgPrizePool, 1)}×
            </div>
            <div className="metric-sub">da N={first.numParticipants} a N={last.numParticipants}</div>
          </div>
          <div className="card-sm">
            <div className="metric-label">Margine Fisso</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.green }}>
              {pct(first.avgOrganizerMarginPct)}
            </div>
            <div className="metric-sub">costante indipendentemente da N</div>
          </div>
          <div className="card-sm">
            <div className="metric-label">Profitto per Partecipante</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.amber }}>
              stabile
            </div>
            <div className="metric-sub">business scala linearmente</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          {profitability.keyInsights.map((insight, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--text2)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{i + 1}.</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
