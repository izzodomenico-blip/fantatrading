import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard, Section, pct } from '../components';
import {
  AXIS_STYLE,
  COLORS,
  GRID_STYLE,
  TOOLTIP_STYLE,
  fullRulesBacktest,
  fullRulesStressTest,
  recommendedRulesMarkdown,
  userRulesMarkdown,
  type FullRulesBacktestStat,
  type FullRulesStressSummary,
} from '../data';

const STRATEGIES = ['RANDOM', 'LOW_COST', 'TOP_PLAYER', 'BALANCED', 'VALUE'];
const POLICIES = ['FIVE', 'EXCLUDE', 'PLAYER_ZERO_TEAM_EXCLUDE', 'ZERO', 'PLAYER_MALUS_TEAM_EXCLUDE'];
const RECOMMENDED_POLICY = 'PLAYER_ZERO_TEAM_EXCLUDE';

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatPct(value: number) {
  return pct(value, 1);
}

function getStrategyRows(stats: FullRulesBacktestStat[]) {
  return STRATEGIES.map(strategy =>
    stats.find(row => row.strategy === strategy && row.noVotePolicy === RECOMMENDED_POLICY)
  ).filter(Boolean) as FullRulesBacktestStat[];
}

function getPolicyRows(stats: FullRulesBacktestStat[]) {
  return POLICIES.map(policy => {
    const rows = stats.filter(row => row.noVotePolicy === policy);
    return {
      policy,
      avgFullRulesROI: avg(rows.map(row => row.avgFullRulesROI)),
      pctAbove0: avg(rows.map(row => row.pctAbove0)),
      pctAbove5: avg(rows.map(row => row.pctAbove5)),
      pctAbove7: avg(rows.map(row => row.pctAbove7)),
      pctAbove10: avg(rows.map(row => row.pctAbove10)),
    };
  });
}

function getStressRows(rows: FullRulesStressSummary[]) {
  return [5, 7, 10, 12].map(threshold =>
    rows.find(
      row =>
        row.noVotePolicy === RECOMMENDED_POLICY &&
        row.prizeThresholdPct === threshold &&
        row.platformFeeRate === 0.1 &&
        row.sellCommissionRate === 0.02
    )
  ).filter(Boolean) as FullRulesStressSummary[];
}

function MissingReport({ label }: { label: string }) {
  return (
    <div className="card">
      <div className="empty-state">
        Report non disponibile: <strong>{label}</strong>. La dashboard resta caricabile, ma questa sezione non puo mostrare i dati.
      </div>
    </div>
  );
}

function MarkdownViewer({ title, content }: { title: string; content: string | null }) {
  return (
    <div className="card">
      <div className="doc-title">{title}</div>
      {content ? (
        <pre className="markdown-viewer">{content}</pre>
      ) : (
        <div className="empty-state">Documento markdown non disponibile.</div>
      )}
    </div>
  );
}

export default function FullRulesV1() {
  const strategyRows = fullRulesBacktest ? getStrategyRows(fullRulesBacktest.aggregateCompletedStats) : [];
  const policyRows = fullRulesBacktest ? getPolicyRows(fullRulesBacktest.aggregateCompletedStats) : [];
  const stressRows = fullRulesStressTest ? getStressRows(fullRulesStressTest.combinationSummaries) : [];
  const recommended = fullRulesStressTest?.recommended;
  const valueRow = strategyRows.find(row => row.strategy === 'VALUE');

  return (
    <>
      <div className="page-title">Full Rules V1</div>
      <div className="page-sub">
        Risultati gia generati del modello FULL_RULES_V1 su stagioni completed, con 2025/26 trattata come in_progress.
      </div>

      <Section title="Regolamento consigliato">
        <div className="metric-grid">
          <MetricCard label="Acquisto" value="2%" sub="Commissione acquisto" color="var(--accent)" />
          <MetricCard label="Vendita" value="2%" sub="Commissione vendita V1" color="var(--green)" />
          <MetricCard label="Soglia Premio" value="7%" sub="ROI minimo premiabile" color="var(--amber)" />
          <MetricCard label="Platform Fee" value="10%" sub="Solo sulle commissioni" color="var(--purple)" />
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="config-box">
            <div>
              <span className="config-key">NoVotePolicy: </span>
              <span className="config-val">PLAYER_ZERO_TEAM_EXCLUDE</span>
            </div>
            <div>
              <span className="config-key">SV:           </span>
              <span className="config-val">escluso dalla media squadra, effetto fantasy 0</span>
            </div>
            <div>
              <span className="config-key">Quote:        </span>
              <span className="config-val">+1 = +5%, -1 = -5%, floor perdita -100%</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Confronto strategie full-rules">
        {!fullRulesBacktest ? (
          <MissingReport label="historical_full_rules_backtest.json" />
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Strategia</th>
                  <th>ROI medio</th>
                  <th>&gt; 0%</th>
                  <th>&gt; 5%</th>
                  <th>&gt; 7%</th>
                  <th>&gt; 10%</th>
                </tr>
              </thead>
              <tbody>
                {strategyRows.map(row => (
                  <tr key={row.strategy} className={row.strategy === 'VALUE' ? 'rec-row' : undefined}>
                    <td><strong>{row.strategy}</strong></td>
                    <td>{formatPct(row.avgFullRulesROI)}</td>
                    <td>{formatPct(row.pctAbove0)}</td>
                    <td>{formatPct(row.pctAbove5)}</td>
                    <td>{formatPct(row.pctAbove7)}</td>
                    <td>{formatPct(row.pctAbove10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-note">
              Policy applicata: PLAYER_ZERO_TEAM_EXCLUDE. VALUE resta la strategia piu forte nel backtest completed.
            </div>
          </div>
        )}
      </Section>

      <Section title="Confronto NoVotePolicy">
        {!fullRulesBacktest ? (
          <MissingReport label="historical_full_rules_backtest.json" />
        ) : (
          <div className="card">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={policyRows} margin={{ top: 4, right: 8, bottom: 44, left: 8 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="policy" angle={-18} textAnchor="end" interval={0} height={70} {...AXIS_STYLE} />
                  <YAxis tickFormatter={value => `${value}%`} {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => formatPct(value)} />
                  <Legend />
                  <Bar dataKey="avgFullRulesROI" name="ROI medio" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pctAbove7" name="% sopra 7%" fill={COLORS.green} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>ROI medio</th>
                  <th>&gt; 0%</th>
                  <th>&gt; 5%</th>
                  <th>&gt; 7%</th>
                  <th>&gt; 10%</th>
                </tr>
              </thead>
              <tbody>
                {policyRows.map(row => (
                  <tr key={row.policy} className={row.policy === RECOMMENDED_POLICY ? 'rec-row' : undefined}>
                    <td><strong>{row.policy}</strong></td>
                    <td>{formatPct(row.avgFullRulesROI)}</td>
                    <td>{formatPct(row.pctAbove0)}</td>
                    <td>{formatPct(row.pctAbove5)}</td>
                    <td>{formatPct(row.pctAbove7)}</td>
                    <td>{formatPct(row.pctAbove10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Stress test soglie premio">
        {!fullRulesStressTest ? (
          <MissingReport label="full_rules_stress_test.json" />
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Soglia</th>
                  <th>ROI medio</th>
                  <th>% sopra soglia</th>
                  <th>Vincitori stimati</th>
                  <th>Ricavo piattaforma</th>
                  <th>Attrattivita</th>
                </tr>
              </thead>
              <tbody>
                {stressRows.map(row => (
                  <tr key={row.prizeThresholdPct} className={row.prizeThresholdPct === 7 ? 'rec-row' : undefined}>
                    <td>
                      <strong>{formatPct(row.prizeThresholdPct)}</strong>{' '}
                      {row.prizeThresholdPct === 7 && <span className="badge badge-green">consigliata</span>}
                    </td>
                    <td>{formatPct(row.avgROI)}</td>
                    <td>{formatPct(row.pctAbovePrizeThreshold)}</td>
                    <td>{row.estimatedWinners.toFixed(1)}</td>
                    <td>{row.avgPlatformRevenue.toFixed(2)}</td>
                    <td><span className="badge badge-blue">{row.userAttractiveness}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recommended && (
              <div className="table-note">
                Raccomandazione: soglia {recommended.prizeThresholdPct}%, vendita {(recommended.sellCommissionRate * 100).toFixed(0)}%,
                platform fee {(recommended.platformFeeRate * 100).toFixed(0)}%, policy {recommended.noVotePolicy}.
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Rischi residui">
        <div className="three-col">
          <div className="card-sm risk-card">
            <div className="risk-title">VALUE ancora forte</div>
            <div className="risk-text">
              {valueRow
                ? `VALUE chiude con ROI medio ${formatPct(valueRow.avgFullRulesROI)} e ${formatPct(valueRow.pctAbove7)} sopra la soglia 7%.`
                : 'Il report strategia non e disponibile.'}
            </div>
          </div>
          <div className="card-sm risk-card">
            <div className="risk-title">Quotazioni mancanti per giornata</div>
            <div className="risk-text">
              Il modello usa quotazione iniziale e finale: manca ancora la dinamica reale dei prezzi durante la stagione.
            </div>
          </div>
          <div className="card-sm risk-card">
            <div className="risk-title">Trading reale non simulato</div>
            <div className="risk-text">
              Mancano trading intra-stagione, timing di acquisto/vendita e comportamento utenti reali.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Documenti regolamento">
        <div className="two-col">
          <MarkdownViewer title="REGOLAMENTO V1 CONSIGLIATO" content={recommendedRulesMarkdown} />
          <MarkdownViewer title="REGOLAMENTO FANTATRADING V1 UTENTE" content={userRulesMarkdown} />
        </div>
      </Section>
    </>
  );
}
