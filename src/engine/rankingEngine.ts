import { Portfolio, getPortfolioValue } from '../domain/Portfolio';
import { Team } from '../domain/Team';
import { PrizeAward } from './prizePoolEngine';

export interface RankingEntry {
  rank: number;
  teamId: string;
  teamName: string;
  portfolioValue: number;
  budget: number;
  totalWealth: number;
  prize: number;
}

export function calculateRanking(
  teams: Team[],
  portfolios: Map<string, Portfolio>,
  prizes: PrizeAward[] = [],
): RankingEntry[] {
  const entries: RankingEntry[] = teams.map(team => {
    const portfolio = portfolios.get(team.id);
    const portfolioValue = portfolio ? getPortfolioValue(portfolio) : 0;
    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      portfolioValue,
      budget: team.budget,
      totalWealth: portfolioValue + team.budget,
      prize: 0,
    };
  });

  entries.sort((a, b) => b.totalWealth - a.totalWealth);

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
    const prizeEntry = prizes.find(p => p.rank === entry.rank);
    if (prizeEntry) entry.prize = prizeEntry.amount;
  });

  return entries;
}

export function getRankingByTeamId(ranking: RankingEntry[], teamId: string): RankingEntry | undefined {
  return ranking.find(e => e.teamId === teamId);
}

export function getTopN(ranking: RankingEntry[], n: number): RankingEntry[] {
  return ranking.filter(e => e.rank <= n);
}

// ─── Ranking per ROI% (FREE_ACCESS_VARIABLE_CAPITAL_TRADING_MODEL) ────────────

export interface CapitalInput {
  teamId: string;
  totalCapitalDeposited: number;
}

export interface ROIRankingEntry extends RankingEntry {
  totalCapitalDeposited: number;
  /** ROI percentuale sul capitale versato — criterio principale FAVC. */
  roiPct: number;
}

/**
 * Classifica per ROI percentuale sul capitale versato.
 *
 * Nel modello FAVC ogni utente può investire un capitale diverso, quindi
 * la ricchezza assoluta è una metrica iniqua. Il ROI% è l'unica metrica
 * che confronta tutti i partecipanti sullo stesso piano.
 *
 * @param teams         Lista delle squadre.
 * @param portfolios    Mappa teamId → Portfolio corrente.
 * @param capitalInputs Capitale totale versato per ogni squadra.
 * @param prizes        Assegnazioni premio opzionali (per rank).
 */
export function calculateRankingByROI(
  teams: Team[],
  portfolios: Map<string, Portfolio>,
  capitalInputs: CapitalInput[],
  prizes: PrizeAward[] = [],
): ROIRankingEntry[] {
  const capitalMap = new Map(capitalInputs.map(c => [c.teamId, c.totalCapitalDeposited]));

  const entries: ROIRankingEntry[] = teams.map(team => {
    const portfolio = portfolios.get(team.id);
    const portfolioValue = portfolio ? getPortfolioValue(portfolio) : 0;
    const totalWealth = portfolioValue + team.budget;
    const totalCapitalDeposited = capitalMap.get(team.id) ?? team.budget;
    const roiPct = totalCapitalDeposited > 0
      ? ((totalWealth - totalCapitalDeposited) / totalCapitalDeposited) * 100
      : 0;

    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      portfolioValue,
      budget: team.budget,
      totalWealth,
      totalCapitalDeposited,
      roiPct,
      prize: 0,
    };
  });

  // Ordina per ROI% decrescente; a parità usa ricchezza assoluta come tiebreaker.
  entries.sort((a, b) => b.roiPct - a.roiPct || b.totalWealth - a.totalWealth);

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
    const prizeEntry = prizes.find(p => p.rank === entry.rank);
    if (prizeEntry) entry.prize = prizeEntry.amount;
  });

  return entries;
}
