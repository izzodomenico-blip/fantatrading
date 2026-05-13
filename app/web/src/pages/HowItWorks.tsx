import { Link } from 'react-router-dom';
import { MetricCard, Section, StatusBadges } from '../components';
import { rankingExample, roleLimits, roleNames, ruleSummary } from '../mock/favcDemoData';
import { formatCredits, formatPercent, formatSignedCredits } from '../utils/format';

const flow = [
  ['1', 'Rosa completa', 'Il partecipante costruisce una rosa da 25 giocatori: 3 portieri, 8 difensori, 8 centrocampisti, 6 attaccanti.'],
  ['2', 'Trading virtuale', 'Acquisti e vendite sono mock nel pilot. Le commissioni restano al sistema e il cash virtuale viene usato prima di aggiungere capitale.'],
  ['3', 'Valore giocatore', 'Ogni +1 di quotazione vale +5% sul valore della posizione. Bonus e malus entrano nel fantasyMultiplier.'],
  ['4', 'Settlement', 'A fine stagione si calcola una chiusura contabile virtuale: netLiquidationValue + virtualCashBalance.'],
];

export default function HowItWorks() {
  return (
    <>
      <div className="page-header">
        <div>
          <StatusBadges items={['Pilot virtuale', 'Credito non reale', 'Settlement virtuale']} />
          <div className="page-title">Come funziona</div>
          <div className="page-sub">
            Regolamento semplice della versione FAVC: accesso libero, capitale virtuale variabile e ranking principale su ROI%.
          </div>
        </div>
        <Link className="button button-primary" to="/partecipante-favc">Apri demo</Link>
      </div>

      <Section title="Fondamentali">
        <div className="metric-grid">
          <MetricCard label="Rosa" value="25" sub="3P / 8D / 8C / 6A" color="var(--accent)" />
          <MetricCard label="Budget massimo" value="No" sub="capitale virtuale variabile" color="var(--green)" />
          <MetricCard label="+1 quotazione" value="+5%" sub="sul valore della posizione" color="var(--amber)" />
          <MetricCard label="Ranking" value="ROI%" sub="rendimento percentuale" color="var(--teal)" />
        </div>
      </Section>

      <Section title="Flusso di gioco">
        <div className="timeline-grid">
          {flow.map(([number, title, text]) => (
            <article className="timeline-card" key={title}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Composizione rosa">
        <div className="card">
          <div className="favc-role-grid">
            {(Object.keys(roleLimits) as Array<keyof typeof roleLimits>).map(role => (
              <div className="favc-role-cell" key={role}>
                <span>{roleNames[role]}</span>
                <strong>{roleLimits[role]}</strong>
              </div>
            ))}
          </div>
          <div className="table-note">
            La composizione e vincolante per validare la rosa. La demo mantiene sempre 25 giocatori attivi dopo buy/sell.
          </div>
        </div>
      </Section>

      <Section title="Regole operative">
        <div className="rule-grid">
          {ruleSummary.map(([title, text]) => (
            <article className="card-sm rule-card" key={title}>
              <div className="doc-title">{title}</div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="ROI batte capitale assoluto">
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Posizione</th>
                <th>Team</th>
                <th>Capitale</th>
                <th>Valore finale</th>
                <th>P/L</th>
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
            Il Team A sta sopra Team B perche +20% e maggiore di +10%, anche se Team B ha valore finale assoluto piu alto.
          </div>
        </div>
      </Section>

      <Section title="Confini del pilot">
        <div className="notice-grid">
          <div className="notice-card">
            <span className="badge badge-green">Incluso</span>
            <strong>Credito virtuale e settlement contabile</strong>
            <p>La demo misura capitale depositato virtuale, cash, valore rosa, ROI% e ranking.</p>
          </div>
          <div className="notice-card">
            <span className="badge badge-amber">Escluso</span>
            <strong>Riscatto reale del portafoglio</strong>
            <p>Il modello riscattabile e stato analizzato come variante separata, ma non fa parte del pilot.</p>
          </div>
          <div className="notice-card">
            <span className="badge badge-red">No</span>
            <strong>Nessun payout reale</strong>
            <p>Il credito virtuale non e denaro reale e il settlement finale non genera pagamenti.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
