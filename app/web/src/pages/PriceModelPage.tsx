import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard, Section, fmt, pct } from '../components';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE, priceModel, prizeTable } from '../data';

const baseline = priceModel.randomWalkBaseline;
const chartData = priceModel.points.map(p => ({
  rate: p.meanReversionRate,
  'Drift Medio (cr)': parseFloat(p.avgPriceDriftAbs.toFixed(1)),
  'Δ Montepremi (%)': parseFloat(((p.avgPrizePool - baseline.avgPrizePool) / baseline.avgPrizePool * 100).toFixed(1)),
  'Std Dev Prezzi': parseFloat(p.avgPriceStdDev?.toFixed(1) ?? '0'),
}));

const rec = priceModel.points.find(p => p.meanReversionRate === priceModel.recommendedRate)!;
const driftReduction = ((baseline.avgPriceDriftAbs - rec.avgPriceDriftAbs) / baseline.avgPriceDriftAbs * 100);

const prize = prizeTable.bestBalanced;

export default function PriceModelPage() {
  return (
    <>
      <div className="page-title">Modello di Prezzo Calciatori</div>
      <div className="page-sub">Confronto random walk vs mean-reverting — effetti su drift prezzi e montepremi (Fase 4)</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <MetricCard
          label="Tasso Raccomandato"
          value={`${priceModel.recommendedRate}`}
          sub="meanReversionRate in DEFAULT_RULES"
          color="var(--green)"
        />
        <MetricCard
          label="Riduzione Drift"
          value={`-${fmt(driftReduction, 0)}%`}
          sub={`da ${fmt(baseline.avgPriceDriftAbs, 1)} a ${fmt(rec.avgPriceDriftAbs, 1)} crediti`}
          color="var(--accent)"
        />
        <MetricCard
          label="Impatto Montepremi"
          value={`${fmt((rec.avgPrizePool - baseline.avgPrizePool) / baseline.avgPrizePool * 100, 1)}%`}
          sub="variazione rispetto al random walk"
          color="var(--amber)"
        />
      </div>

      <Section title="Drift Prezzi e Montepremi vs Mean Reversion Rate">
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Asse sinistro: drift medio assoluto dei prezzi (crediti) · Asse destro: variazione % montepremi rispetto a random walk
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 40, bottom: 16, left: 16 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="rate" label={{ value: 'Mean Reversion Rate', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 12 }} height={44} {...AXIS_STYLE} />
                <YAxis yAxisId="left" label={{ value: 'Drift (cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} {...AXIS_STYLE} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} label={{ value: 'Δ Montepremi', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }} {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
                <ReferenceLine yAxisId="left" x={priceModel.recommendedRate} stroke={COLORS.green} strokeDasharray="5 5" label={{ value: 'REC', fill: COLORS.green, fontSize: 11, position: 'top' }} />
                <Line yAxisId="left" type="monotone" dataKey="Drift Medio (cr)" stroke={COLORS.blue} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.blue }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="Δ Montepremi (%)" stroke={COLORS.amber} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.amber }} activeDot={{ r: 6 }} strokeDasharray="4 2" />
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
                <th>Rate</th>
                <th>Drift Medio (cr)</th>
                <th>Drift Relativo %</th>
                <th>Std Dev Prezzi</th>
                <th>Montepremi</th>
                <th>Δ vs Random Walk</th>
                <th>Break-even</th>
              </tr>
            </thead>
            <tbody>
              {priceModel.points.map(p => {
                const isRec = p.meanReversionRate === priceModel.recommendedRate;
                const delta = ((p.avgPrizePool - baseline.avgPrizePool) / baseline.avgPrizePool * 100);
                return (
                  <tr key={p.meanReversionRate} className={isRec ? 'rec-row' : ''}>
                    <td>
                      <strong style={{ color: isRec ? COLORS.green : 'inherit' }}>{p.meanReversionRate}</strong>
                      {isRec && <span className="badge badge-green" style={{ marginLeft: 6 }}>REC</span>}
                      {p.meanReversionRate === 0 && <span className="badge badge-blue" style={{ marginLeft: 6 }}>baseline</span>}
                    </td>
                    <td>{fmt(p.avgPriceDriftAbs, 1)}</td>
                    <td>{fmt(p.avgPriceDriftRel, 1)}%</td>
                    <td>{p.avgPriceStdDev ? fmt(p.avgPriceStdDev, 1) : '—'}</td>
                    <td>{Math.round(p.avgPrizePool).toLocaleString('it-IT')} cr</td>
                    <td style={{ color: delta < 0 ? COLORS.amber : 'inherit' }}>
                      {p.meanReversionRate === 0 ? 'baseline' : `${delta.toFixed(1)}%`}
                    </td>
                    <td>{pct(p.pctAbove0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Analisi Motivazione">
        <div className="card">
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: COLORS.green }}>
            Perché rate = {priceModel.recommendedRate}?
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: 16 }}>
            {priceModel.recommendedRationale}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {priceModel.keyFindings.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--text2)', alignItems: 'flex-start' }}>
                <span style={{ color: COLORS.teal, flexShrink: 0 }}>•</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Prize Table Raccomandata (N=50)">
        <div className="three-col">
          {[
            ['Bilanciata (REC)', `${prize.numPrizes} premi, top=${(prize.firstPrizePct * 100).toFixed(0)}%`, COLORS.green],
            ['Break-even', pct(prize.pctAbove0) + ' partecipanti', COLORS.blue],
            ['ROI Vincitore', `~${fmt(prize.avgWinnerROIPct, 0)}%`, COLORS.amber],
          ].map(([label, val, color]) => (
            <div key={label as string} className="card-sm">
              <div className="metric-label">{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: color as string, marginTop: 6 }}>{val}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
