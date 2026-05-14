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

      <Section title="Come entrano i voti nel valore della tua rosa">
        <div className="voting-flow">
          <ol className="voting-flow-steps">
            <li>
              <span className="voting-flow-step">1</span>
              <div>
                <strong>La tua squadra gioca la giornata</strong>
                <p>I 25 giocatori della tua rosa ricevono voto in pagella o vengono segnati come SV (senza voto).</p>
              </div>
            </li>
            <li>
              <span className="voting-flow-step">2</span>
              <div>
                <strong>Gli SV non entrano nella media squadra</strong>
                <p>Policy PLAYER_ZERO_TEAM_EXCLUDE: chi non ha voto e' escluso sia dalla somma sia dal divisore.</p>
              </div>
            </li>
            <li>
              <span className="voting-flow-step">3</span>
              <div>
                <strong>La media squadra determina la fascia</strong>
                <p>Fascia 0 = &lt; 5,00 · Fascia 1 = 5,00-5,49 · Fascia 2 = 5,50-5,99 · Fascia 3 = 6,00-6,49 · Fascia 4 = &gt;= 6,50.</p>
              </div>
            </li>
            <li>
              <span className="voting-flow-step">4</span>
              <div>
                <strong>Fascia + voto = bonus/malus FantaTrading</strong>
                <p>La tabella ufficiale assegna a ogni combinazione un bonus/malus % sul valore individuale. Voto 6 e' neutro nelle Fasce 1-4. SV = 0%.</p>
              </div>
            </li>
            <li>
              <span className="voting-flow-step">5</span>
              <div>
                <strong>Il bonus modifica il valore del singolo giocatore</strong>
                <p>Il valore del giocatore = quota × (1 + (Qa - Qi) × 5%) × (1 + bonusFT). Bonus positivo lo fa salire, negativo lo fa scendere.</p>
              </div>
            </li>
            <li>
              <span className="voting-flow-step">6</span>
              <div>
                <strong>Il valore complessivo della rosa cambia</strong>
                <p>Il portafoglio si aggiorna giornata per giornata. Guadagno % = (valore finale + cash − capitale depositato) / capitale.</p>
              </div>
            </li>
          </ol>

          <div className="voting-flow-example card">
            <span className="badge badge-blue">Esempio concreto</span>
            <h3>Da media 6,18 a Fascia 3, voto 7 → bonus +1,50%</h3>
            <ul>
              <li><strong>Media squadra 6,18</strong> → Fascia 3 (range 6,00 - 6,49).</li>
              <li><strong>Giocatore con voto 7</strong> in Fascia 3 → bonus FantaTrading <strong className="positive">+1,50%</strong>.</li>
              <li><strong>Giocatore SV</strong> → escluso dalla media, bonus FT <strong>0%</strong>.</li>
              <li><strong>Quota +1</strong> rispetto all'iniziale → effetto quota <strong className="positive">+5%</strong> sul valore.</li>
              <li><strong>Valore finale</strong> giocatore = effetto quota × effetto voto. Esempio: quota 10 con quota +1 e bonus +1,50% → 10 × 1,05 × 1,015 = <strong>10,66</strong>.</li>
            </ul>
            <p className="table-note">Il capitale e' virtuale. Nessun pagamento reale, nessun payout reale.</p>
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
