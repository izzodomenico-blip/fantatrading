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
import { useEffect, useState } from 'react';
import { MetricCard, Section, pct } from '../components';
import {
  AXIS_STYLE,
  COLORS,
  GRID_STYLE,
  TOOLTIP_STYLE,
  fullRulesBacktest,
  fullRulesStressTest,
  prizePoolAttractivenessMarkdown,
  loadPrizePoolAttractiveness,
  recommendedRulesMarkdown,
  userRulesMarkdown,
  type FullRulesBacktestStat,
  type FullRulesStressSummary,
  type PrizePoolAttractivenessReport,
  type PrizePoolScenarioMetric,
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

function formatEuro(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatScore(value: number) {
  return value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function getParticipantScenarioRows(rows: PrizePoolScenarioMetric[], recommended: PrizePoolScenarioMetric) {
  return [20, 50, 100, 250, 500, 1000].map(participants => {
    const exact = rows.find(row =>
      row.participants === participants &&
      row.entryFee === recommended.entryFee &&
      row.prizeEntryShare === recommended.prizeEntryShare &&
      row.systemEntryShare === recommended.systemEntryShare &&
      row.buyCommissionRate === recommended.buyCommissionRate &&
      row.sellCommissionRate === recommended.sellCommissionRate &&
      row.prizeThreshold === recommended.prizeThreshold &&
      row.prizeTableId === recommended.prizeTableId
    );

    return exact ?? {
      ...recommended,
      id: `${recommended.id}_U${participants}_DERIVED`,
      participants,
      grossPrizePool: participants * recommended.entryFee * recommended.prizeEntryShare,
      netDistributablePrizePool: participants * recommended.entryFee * recommended.prizeEntryShare,
      systemRevenueFromEntries: participants * recommended.entryFee * recommended.systemEntryShare,
      estimatedWinners: Math.ceil(participants * 0.1),
      probabilityOfWinning: Math.ceil(participants * 0.1) / participants,
    };
  });
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
  const [prizePoolAttractiveness, setPrizePoolAttractiveness] = useState<PrizePoolAttractivenessReport | null>(null);
  const [prizePoolLoadState, setPrizePoolLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const strategyRows = fullRulesBacktest ? getStrategyRows(fullRulesBacktest.aggregateCompletedStats) : [];
  const policyRows = fullRulesBacktest ? getPolicyRows(fullRulesBacktest.aggregateCompletedStats) : [];
  const stressRows = fullRulesStressTest ? getStressRows(fullRulesStressTest.combinationSummaries) : [];
  const recommended = fullRulesStressTest?.recommended;
  const valueRow = strategyRows.find(row => row.strategy === 'VALUE');
  const prizePoolRecommendation = prizePoolAttractiveness?.recommendation.recommendedV1;
  const participantScenarioRows = prizePoolAttractiveness && prizePoolRecommendation
    ? getParticipantScenarioRows(prizePoolAttractiveness.matrixResults, prizePoolRecommendation)
    : [];
  const example100 = participantScenarioRows.find(row => row.participants === 100);

  useEffect(() => {
    let mounted = true;
    loadPrizePoolAttractiveness()
      .then(report => {
        if (!mounted) return;
        setPrizePoolAttractiveness(report);
        setPrizePoolLoadState(report ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!mounted) return;
        setPrizePoolAttractiveness(null);
        setPrizePoolLoadState('missing');
      });
    return () => {
      mounted = false;
    };
  }, []);

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
          <MetricCard label="Commissioni" value="100%" sub="Trattenute dal sistema" color="var(--purple)" />
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

      <Section title="Montepremi & Economia">
        {prizePoolLoadState === 'loading' ? (
          <div className="card">
            <div className="empty-state">Caricamento report prize_pool_attractiveness_simulation.json...</div>
          </div>
        ) : !prizePoolAttractiveness || !prizePoolRecommendation ? (
          <MissingReport label="prize_pool_attractiveness_simulation.json" />
        ) : (
          <>
            <div className="metric-grid">
              <MetricCard label="Quota iscrizione" value={formatEuro(prizePoolRecommendation.entryFee)} sub="per partecipante" color="var(--accent)" />
              <MetricCard label="Montepremi" value={formatPct(prizePoolRecommendation.prizeEntryShare * 100)} sub="della quota iscrizione" color="var(--green)" />
              <MetricCard label="Sistema" value={formatPct(prizePoolRecommendation.systemEntryShare * 100)} sub="della quota iscrizione" color="var(--amber)" />
              <MetricCard label="Score" value={`${formatScore(prizePoolRecommendation.finalScore)}/100`} sub="simulazione economica" color="var(--teal)" />
            </div>

            <div className="two-col" style={{ marginTop: 16 }}>
              <div className="card">
                <div className="doc-title">MODELLO ECONOMICO V1</div>
                <div className="config-box">
                  <div><span className="config-key">quotaIscrizione: </span><span className="config-val">{formatEuro(prizePoolRecommendation.entryFee)}</span></div>
                  <div><span className="config-key">montepremi:       </span><span className="config-val">{formatPct(prizePoolRecommendation.prizeEntryShare * 100)}</span></div>
                  <div><span className="config-key">sistema:          </span><span className="config-val">{formatPct(prizePoolRecommendation.systemEntryShare * 100)}</span></div>
                  <div><span className="config-key">commissioni:      </span><span className="config-val">100% trattenute dal sistema</span></div>
                  <div><span className="config-key">premi:            </span><span className="config-val">top 10% partecipanti</span></div>
                </div>
              </div>

              <div className="card">
                <div className="doc-title">ESEMPIO 100 PARTECIPANTI</div>
                {example100 ? (
                  <div className="economy-list">
                    <div><span>Incasso iscrizioni</span><strong>{formatEuro(example100.participants * example100.entryFee)}</strong></div>
                    <div><span>Montepremi</span><strong>{formatEuro(example100.netDistributablePrizePool)}</strong></div>
                    <div><span>Quota sistema da iscrizione</span><strong>{formatEuro(example100.systemRevenueFromEntries)}</strong></div>
                    <div><span>Commissioni trading</span><strong>{formatEuro(example100.systemRevenueFromCommissions)}</strong></div>
                  </div>
                ) : (
                  <div className="empty-state">Scenario 100 partecipanti non disponibile nel report.</div>
                )}
                <div className="table-note">
                  Le commissioni trading si aggiungono alla quota sistema da iscrizione come ricavo operativo del sistema.
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Partecipanti</th>
                    <th>Incasso iscrizioni</th>
                    <th>Montepremi</th>
                    <th>Quota sistema</th>
                    <th>Vincitori stimati</th>
                    <th>Premio medio</th>
                  </tr>
                </thead>
                <tbody>
                  {participantScenarioRows.map(row => (
                    <tr key={row.participants} className={row.participants === 100 ? 'rec-row' : undefined}>
                      <td><strong>{row.participants}</strong></td>
                      <td>{formatEuro(row.participants * row.entryFee)}</td>
                      <td>{formatEuro(row.netDistributablePrizePool)}</td>
                      <td>{formatEuro(row.systemRevenueFromEntries)}</td>
                      <td>{row.estimatedWinners}</td>
                      <td>{formatEuro(row.averageWinnerPrize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="three-col" style={{ marginTop: 16 }}>
              <div className="card-sm risk-card">
                <div className="risk-title">Distribuzione premi</div>
                <div className="risk-text">
                  La V1 premia il top 10% dei partecipanti. Sul caso 100 utenti significa {example100?.estimatedWinners ?? prizePoolRecommendation.estimatedWinners} vincitori stimati.
                </div>
              </div>
              <div className="card-sm risk-card">
                <div className="risk-title">Costi operativi</div>
                <div className="risk-text">
                  La quota iscrizione alimenta il montepremi; le commissioni trading sono costi operativi trattenuti dal sistema.
                </div>
              </div>
              <div className="card-sm risk-card">
                <div className="risk-title">Guadagno utente</div>
                <div className="risk-text">
                  Il guadagno deriva dal rendimento netto della rosa, dalle plusvalenze realizzate e dai premi di classifica.
                </div>
              </div>
            </div>
          </>
        )}
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

      <Section title="Report montepremi e attrattivita">
        <MarkdownViewer title="PRIZE POOL AND ECONOMIC ATTRACTIVENESS SIMULATION" content={prizePoolAttractivenessMarkdown} />
      </Section>
    </>
  );
}
