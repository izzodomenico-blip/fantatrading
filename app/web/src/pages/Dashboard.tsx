import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard, Section, fmt, pct } from '../components';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE, optimizer, priceModel, prizeTable, profitability } from '../data';

const bal = optimizer.bestPerObjective['balanced'];
const prize = prizeTable.bestBalanced;
const scaleData = profitability.scenarios.map(s => ({
  n: s.numParticipants,
  'Montepremi': Math.round(s.avgPrizePool),
  'Ricavo Org.': Math.round(s.avgPlatformRevenue),
  'Premio 1°': Math.round(s.avgFirstPrize),
}));

export default function Dashboard() {
  return (
    <>
      <div className="page-title">Dashboard</div>
      <div className="page-sub">Validazione matematica del regolamento FantaTrading · Fasi 1–4 complete</div>

      <div className="verdict">
        <div className="verdict-text">
          <strong style={{ color: 'var(--green)' }}>Il modello è economicamente sostenibile.</strong>{' '}
          L'organizzatore genera margine positivo in tutti gli scenari testati. Il sistema funziona come una lotteria skill-based:
          pochi vincitori con ROI elevato, maggioranza perde la quota di iscrizione.
        </div>
      </div>

      <Section title="Metriche chiave (configurazione bilanciata, N=50)">
        <div className="metric-grid">
          <MetricCard
            label="Margine Organizzatore"
            value={pct(bal.avgOrganizerMarginPct)}
            sub={`~${fmt(bal.orgProfitPerParticipant, 0)} cr/partecipante`}
            color="var(--green)"
          />
          <MetricCard
            label="Montepremi Medio"
            value={`~${fmt(bal.avgFirstPrize / (prize.firstPrizePct || 0.3), 0)} cr`}
            sub={`Premio 1° ~${fmt(bal.avgFirstPrize, 0)} cr`}
            color="var(--accent)"
          />
          <MetricCard
            label="Break-even Partecipanti"
            value={pct(prize.pctAbove0)}
            sub={`${prize.numPrizes} vincitori recuperano la quota`}
            color="var(--amber)"
          />
          <MetricCard
            label="ROI Vincitore"
            value={`~${fmt(prize.avgWinnerROIPct, 0)}%`}
            sub="Rendimento netto sul budget"
            color="var(--purple)"
          />
        </div>
      </Section>

      <div className="two-col">
        <Section title="Configurazione Raccomandata">
          <div className="config-box">
            <div>
              <span className="config-key">buyCommissionRate:  </span>
              <span className="config-val">{(bal.buyCommissionRate * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="config-key">sellCommissionRate: </span>
              <span className="config-val">{(bal.sellCommissionRate * 100).toFixed(2)}%</span>
            </div>
            <div>
              <span className="config-key">platformFeeRate:    </span>
              <span className="config-val">{(bal.platformFeeRate * 100).toFixed(0)}%</span>
              <span className="config-comment">  ← margine org.</span>
            </div>
            <div>
              <span className="config-key">meanReversionRate:  </span>
              <span className="config-val">{priceModel.recommendedRate}</span>
              <span className="config-comment">  ← Fase 4</span>
            </div>
            <div>
              <span className="config-key">prizeTable:         </span>
              <span className="config-val">{prize.numPrizes} premi, top={pct(prize.firstPrizePct * 100, 0)}</span>
            </div>
            <div>
              <span className="config-key">initialBudget:      </span>
              <span className="config-val">500 cr</span>
            </div>
            <div>
              <span className="config-key">registrationFee:    </span>
              <span className="config-val">50 cr</span>
            </div>
            <div>
              <span className="config-key">roundsPerSeason:    </span>
              <span className="config-val">38</span>
            </div>
          </div>
        </Section>

        <Section title="Risultati Attesi per Scala">
          <div className="card">
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
              Montepremi, ricavo organizzatore e premio 1° al variare di N partecipanti
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scaleData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="n" label={{ value: 'N partecipanti', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} {...AXIS_STYLE} height={40} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v.toLocaleString('it-IT')} cr`} />
                  <Bar dataKey="Montepremi" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Ricavo Org." fill={COLORS.green} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Premio 1°" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Prossimi Passi">
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Alpha test', 'Validare λ=3 ops/round con utenti reali'],
              ['Prize table dinamica', 'Adattare i premi proporzionalmente a N'],
              ['Aggiornare DEFAULT_RULES', 'meanReversionRate=0.05 già aggiornato ✓'],
              ['UI interattiva', 'Questa dashboard — in corso ✓'],
            ].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', marginTop: 1 }}>→</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
