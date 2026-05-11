import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Section } from '../components';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE, optimizer, sensitivity } from '../data';

const { sweeps } = sensitivity;

const marginData = sweeps.map(s => {
  const margins = s.points.map(p => p.avgOrganizerMarginPct);
  return { name: s.paramDisplayName, range: parseFloat((Math.max(...margins) - Math.min(...margins)).toFixed(1)) };
}).sort((a, b) => b.range - a.range);

const roiData = sweeps.map(s => {
  const rois = s.points.map(p => p.avgWinnerROIPct);
  return { name: s.paramDisplayName, range: Math.round(Math.max(...rois) - Math.min(...rois)) };
}).sort((a, b) => b.range - a.range);

const bal = optimizer.bestPerObjective['balanced'];
const paretoData = optimizer.paretoFrontier.map((c: { platformFeeRate: number; avgPlatformRevenue: number; avgFirstPrize: number }) => ({
  platformFee: (c.platformFeeRate * 100).toFixed(0) + '%',
  orgRevenue: Math.round(c.avgPlatformRevenue),
  firstPrize: Math.round(c.avgFirstPrize),
})).sort((a: { orgRevenue: number }, b: { orgRevenue: number }) => a.orgRevenue - b.orgRevenue);

export default function SensitivityPage() {
  return (
    <>
      <div className="page-title">Sensibilità e Ottimizzazione</div>
      <div className="page-sub">Impatto one-at-a-time dei parametri sul sistema e risultati del grid search (Fase 3)</div>

      <div className="two-col">
        <Section title="Impatto sul Margine Organizzatore (range pp)">
          <div className="card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={marginData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `${v}pp`} {...AXIS_STYLE} />
                  <YAxis type="category" dataKey="name" width={170} {...AXIS_STYLE} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} pp`, 'Range margine']} />
                  <Bar dataKey="range" radius={[0, 4, 4, 0]}>
                    {marginData.map((d, i) => <Cell key={i} fill={d.range > 10 ? COLORS.green : d.range > 0 ? COLORS.blue : COLORS.gray} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        <Section title="Impatto sul ROI Vincitore (range pp)">
          <div className="card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roiData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} {...AXIS_STYLE} />
                  <YAxis type="category" dataKey="name" width={170} {...AXIS_STYLE} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString('it-IT')} pp`, 'Range ROI vincitore']} />
                  <Bar dataKey="range" radius={[0, 4, 4, 0]}>
                    {roiData.map((d, i) => <Cell key={i} fill={COLORS.amber} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Key Findings">
        <div className="card">
          {sensitivity.keyFindings.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--text2)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Grid Search — ${optimizer.totalCandidatesEvaluated} combinazioni (buy × sell × platform)`}>
        <div className="two-col">
          <div className="card">
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>Frontiera di Pareto: (Ricavo Org., Premio 1°)</div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paretoData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="platformFee" {...AXIS_STYLE} label={{ value: 'Platform Fee Rate', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} height={40} />
                  <YAxis tickFormatter={v => `${v}`} {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v.toLocaleString('it-IT')} cr`} />
                  <Bar dataKey="orgRevenue" name="Ricavo Org." fill={COLORS.green} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="firstPrize" name="Premio 1°" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
              Tensione principale: platformFeeRate alto → più ricavo org. ma premi più piccoli
            </div>
          </div>

          <div className="card">
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>Migliori per obiettivo</div>
            <table>
              <thead>
                <tr>
                  <th>Obiettivo</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Platform</th>
                  <th>Margine</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(optimizer.bestPerObjective).map(([obj, c]) => (
                  <tr key={obj} className={obj === 'balanced' ? 'rec-row' : ''}>
                    <td style={{ fontSize: 12 }}>
                      {obj === 'balanced' ? <strong>Bilanciato ✓</strong> : obj.replace('max', 'Max ').replace(/([A-Z])/g, ' $1').trim()}
                    </td>
                    <td>{(c.buyCommissionRate * 100).toFixed(0)}%</td>
                    <td>{(c.sellCommissionRate * 100).toFixed(2)}%</td>
                    <td>{(c.platformFeeRate * 100).toFixed(0)}%</td>
                    <td>{c.avgOrganizerMarginPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Raccomandazioni Optimizer">
        <div className="card">
          {optimizer.recommendations.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--text2)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
