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
import { Section, fmt, pct } from '../components';
import { AXIS_STYLE, GRID_STYLE, MODEL_COLORS, TOOLTIP_STYLE, ruleComparison } from '../data';

const N_FOCUS = 100;
const rows100 = ruleComparison.rows.filter(r => r.numParticipants === N_FOCUS);
const marginData = rows100.map(r => ({ model: r.modelId, value: r.avgOrganizerMarginPct, name: r.modelName }));
const roiData = rows100.map(r => ({ model: r.modelId, value: Math.round(r.avgWinnerROIPct / 100), name: r.modelName }));

const N_OPTIONS = [...new Set(ruleComparison.rows.map(r => r.numParticipants))].sort((a, b) => a - b);

export default function RuleComparison() {
  return (
    <>
      <div className="page-title">Modelli Regolamento</div>
      <div className="page-sub">Confronto 5 modelli di commissioni a N={N_FOCUS} partecipanti (Fase 3)</div>

      <div className="two-col">
        <Section title={`Margine Organizzatore (N=${N_FOCUS})`}>
          <div className="card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={marginData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="model" {...AXIS_STYLE} />
                  <YAxis tickFormatter={v => `${v}%`} domain={[0, 30]} {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margine']} labelFormatter={l => rows100.find(r => r.modelId === l)?.modelName ?? l} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {marginData.map(d => <Cell key={d.model} fill={MODEL_COLORS[d.model]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        <Section title={`ROI Vincitore / 100 (N=${N_FOCUS})`}>
          <div className="card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={roiData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="model" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${(v * 100).toLocaleString('it-IT')}%`, 'ROI Vincitore']} labelFormatter={l => rows100.find(r => r.modelId === l)?.modelName ?? l} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {roiData.map(d => <Cell key={d.model} fill={MODEL_COLORS[d.model]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      </div>

      <Section title={`Confronto Completo (N=${N_FOCUS})`}>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Modello</th>
                <th>Descrizione</th>
                <th>Margine %</th>
                <th>Break-even</th>
                <th>ROI Vincitore</th>
                <th>Rischio 0</th>
                <th>Sostenibile</th>
              </tr>
            </thead>
            <tbody>
              {rows100.map(r => (
                <tr key={r.modelId} className={r.modelId === 'M2' ? 'rec-row' : ''}>
                  <td>
                    <span style={{ color: MODEL_COLORS[r.modelId], fontWeight: 700 }}>{r.modelId}</span>
                    {r.modelId === 'M2' && <span className="badge badge-blue" style={{ marginLeft: 6 }}>REC</span>}
                  </td>
                  <td style={{ color: 'var(--text2)' }}>{r.modelName}</td>
                  <td>{pct(r.avgOrganizerMarginPct)}</td>
                  <td>{pct(r.pctAbove0)}</td>
                  <td>{fmt(r.avgWinnerROIPct, 0)}%</td>
                  <td>{r.platformLossRisk > 0 ? <span className="badge badge-red">{fmt(r.platformLossRisk, 1)}%</span> : <span className="badge badge-green">0%</span>}</td>
                  <td><span className={`badge badge-${r.isSustainable ? 'green' : 'red'}`}>{r.isSustainable ? 'SÌ' : 'NO'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Scala Completa (tutti i modelli × N)">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Modello</th>
                  {N_OPTIONS.map(n => <th key={n}>N={n} — Margine%</th>)}
                </tr>
              </thead>
              <tbody>
                {['M1', 'M2', 'M3', 'M4', 'M5'].map(modelId => (
                  <tr key={modelId} className={modelId === 'M2' ? 'rec-row' : ''}>
                    <td style={{ color: MODEL_COLORS[modelId], fontWeight: 700 }}>{modelId}</td>
                    {N_OPTIONS.map(n => {
                      const row = ruleComparison.rows.find(r => r.modelId === modelId && r.numParticipants === n);
                      return <td key={n}>{row ? pct(row.avgOrganizerMarginPct) : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Raccomandazioni">
        <div className="card">
          {ruleComparison.recommendations.map((r, i) => (
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
