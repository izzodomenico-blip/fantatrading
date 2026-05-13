import { Link } from 'react-router-dom';
import { MetricCard, Section, StatusBadges } from '../components';
import { rankingExample, ruleSummary } from '../mock/favcDemoData';
import { formatCredits, formatPercent, formatSignedCredits } from '../utils/format';

const steps = [
  {
    title: 'Costruisci la rosa',
    text: 'Selezioni 25 giocatori con composizione 3P / 8D / 8C / 6A. Non hai un budget massimo: il capitale virtuale cresce solo quando serve.',
  },
  {
    title: 'Segui il mercato',
    text: 'Ogni calciatore si comporta come un asset: quote, prestazioni e bonus/malus modificano il valore della posizione.',
  },
  {
    title: 'Scala il ROI%',
    text: 'La classifica principale premia il rendimento percentuale. Il capitale piu alto non garantisce un vantaggio automatico.',
  },
];

const differences = [
  ['Fantacalcio classico', 'budget fisso, rosa statica, focus sui punti giornata'],
  ['FantaTrading V1', 'capitale virtuale variabile, trading libero, ranking ROI%'],
  ['Pilot', 'settlement virtuale, nessun credito riscattabile, nessun payout reale'],
];

export default function Home() {
  return (
    <>
      <section className="hero-shell">
        <div className="hero-scene" aria-hidden="true">
          <div className="pitch-line pitch-line-a" />
          <div className="pitch-line pitch-line-b" />
          <div className="ticker-lane ticker-lane-a">
            <span>DEF Bellini +8.4%</span>
            <span>MID Serra +11.2%</span>
            <span>FWD Romano +10.8%</span>
          </div>
          <div className="ticker-lane ticker-lane-b">
            <span>ROI Team A +20%</span>
            <span>Cash virtuale 0.00</span>
            <span>Ranking ROI #1</span>
          </div>
          <div className="market-card-floating card-a">
            <strong>150 -&gt; 180</strong>
            <span>+20% ROI</span>
          </div>
          <div className="market-card-floating card-b">
            <strong>600 -&gt; 660</strong>
            <span>+10% ROI</span>
          </div>
        </div>

        <div className="hero-content">
          <StatusBadges items={['Pilot virtuale', 'Nessun payout reale', 'Ranking ROI%']} />
          <h1>FantaTrading V1</h1>
          <p className="hero-copy">
            Un gioco fantasy/trading sui calciatori: costruisci una rosa, tratti i giocatori come asset virtuali e vinci
            scalando la classifica per rendimento percentuale.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/partecipante-favc">Prova demo partecipante</Link>
            <Link className="button button-secondary" to="/come-funziona">Vedi regolamento</Link>
            <Link className="button button-ghost" to="/dashboard">Vedi analisi modello</Link>
          </div>
        </div>
      </section>

      <Section title="Concept in 3 step">
        <div className="step-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span className="step-index">{index + 1}</span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Perche e diverso">
        <div className="comparison-grid">
          {differences.map(([title, text]) => (
            <article className="card" key={title}>
              <div className="doc-title">{title}</div>
              <p className="feature-copy">{text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Metriche modello FAVC">
        <div className="metric-grid">
          <MetricCard label="Accesso" value="Libero" sub="nessuna quota obbligatoria" color="var(--teal)" />
          <MetricCard label="Capitale" value="Variabile" sub="virtuale, nessun tetto" color="var(--accent)" />
          <MetricCard label="Rosa" value="25" sub="3P / 8D / 8C / 6A" color="var(--green)" />
          <MetricCard label="Settlement" value="Virtuale" sub="chiusura contabile demo" color="var(--amber)" />
        </div>
      </Section>

      <Section title="Ranking ROI demo">
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Team</th>
                <th>Capitale depositato</th>
                <th>Valore finale</th>
                <th>Profit/Loss</th>
                <th>ROI%</th>
              </tr>
            </thead>
            <tbody>
              {rankingExample.map(row => (
                <tr key={row.team} className={row.rank === 1 ? 'rec-row' : undefined}>
                  <td><strong>#{row.rank}</strong></td>
                  <td>{row.team}</td>
                  <td>{formatCredits(row.totalCapitalDeposited, 0)}</td>
                  <td>{formatCredits(row.finalValue, 0)}</td>
                  <td className="positive">{formatSignedCredits(row.profitLoss, 0)}</td>
                  <td><strong>{formatPercent(row.roiPct, 0)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-note">
            Team A: 150 -&gt; 180 = +20%. Team B: 600 -&gt; 660 = +10%. Sopra sta il rendimento, non il capitale assoluto.
          </div>
        </div>
      </Section>

      <Section title="Regole chiave">
        <div className="rule-strip">
          {ruleSummary.slice(0, 6).map(([title, text]) => (
            <div className="rule-pill" key={title}>
              <span>{title}</span>
              <strong>{text}</strong>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
