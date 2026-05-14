export type FavcRole = 'P' | 'D' | 'C' | 'A';
export type FavcStatus = 'ACTIVE' | 'SOLD';
export type OperationType = 'BUY' | 'SELL';

import { createMockTrend, type PlayerTrendPoint } from '../utils/playerTrend';

export type DemoPosition = {
  id: string;
  playerId?: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  initialQuote: number;
  currentQuote: number;
  fantasyMultiplier: number;
  status: FavcStatus;
  trend?: PlayerTrendPoint[];
};

export type DemoMarketPlayer = {
  id: string;
  playerId?: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  quote: number;
  trendPct: number;
  performancePct: number;
  available: boolean;
  trend?: PlayerTrendPoint[];
};

export type DemoOperation = {
  id: string;
  type: OperationType;
  playerName: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  capitalAdded: number;
  cashBefore: number;
  cashAfter: number;
  round: string;
};

export type HistoryPoint = {
  label: string;
  portfolioValue: number;
  roiPct: number;
};

export const BUY_COMMISSION_RATE = 0.02;
export const SELL_COMMISSION_RATE = 0.0125;

export const roleLimits: Record<FavcRole, number> = {
  P: 3,
  D: 8,
  C: 8,
  A: 6,
};

export const roleNames: Record<FavcRole, string> = {
  P: 'Portiere',
  D: 'Difensore',
  C: 'Centrocampista',
  A: 'Attaccante',
};

const originalRoster: DemoPosition[] = [
  { id: 'p-1', playerName: 'Martelli', realTeam: 'Torino', role: 'P', initialQuote: 5, currentQuote: 5, fantasyMultiplier: 1, status: 'SOLD' },
  { id: 'p-2', playerName: 'Conti', realTeam: 'Bologna', role: 'P', initialQuote: 6, currentQuote: 10, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'p-3', playerName: 'Riva', realTeam: 'Empoli', role: 'P', initialQuote: 4, currentQuote: 8, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-1', playerName: 'Bellini', realTeam: 'Inter', role: 'D', initialQuote: 5, currentQuote: 9, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-2', playerName: 'Grassi', realTeam: 'Roma', role: 'D', initialQuote: 7, currentQuote: 11, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-3', playerName: 'Silva', realTeam: 'Milan', role: 'D', initialQuote: 6, currentQuote: 10, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-4', playerName: 'Ferrari', realTeam: 'Sassuolo', role: 'D', initialQuote: 4, currentQuote: 8, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-5', playerName: 'Costa', realTeam: 'Napoli', role: 'D', initialQuote: 8, currentQuote: 12, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-6', playerName: 'Moretti', realTeam: 'Genoa', role: 'D', initialQuote: 5, currentQuote: 9, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-7', playerName: 'Neri', realTeam: 'Lazio', role: 'D', initialQuote: 6, currentQuote: 10, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'd-8', playerName: 'Ricci', realTeam: 'Udinese', role: 'D', initialQuote: 4, currentQuote: 8, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-1', playerName: 'Bianchi', realTeam: 'Atalanta', role: 'C', initialQuote: 6, currentQuote: 10, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-2', playerName: 'Esposito', realTeam: 'Fiorentina', role: 'C', initialQuote: 5, currentQuote: 9, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-3', playerName: 'Serra', realTeam: 'Juventus', role: 'C', initialQuote: 8, currentQuote: 12, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-4', playerName: 'Marino', realTeam: 'Monza', role: 'C', initialQuote: 7, currentQuote: 11, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-5', playerName: 'Vitale', realTeam: 'Parma', role: 'C', initialQuote: 4, currentQuote: 8, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-6', playerName: 'Leone', realTeam: 'Verona', role: 'C', initialQuote: 6, currentQuote: 10, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-7', playerName: 'Mancini', realTeam: 'Cagliari', role: 'C', initialQuote: 5, currentQuote: 9, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'c-8', playerName: 'Sala', realTeam: 'Como', role: 'C', initialQuote: 4, currentQuote: 8, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'a-1', playerName: 'Romano', realTeam: 'Napoli', role: 'A', initialQuote: 8, currentQuote: 12, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'a-2', playerName: 'De Luca', realTeam: 'Inter', role: 'A', initialQuote: 9, currentQuote: 13, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'a-3', playerName: 'Sartori', realTeam: 'Milan', role: 'A', initialQuote: 7, currentQuote: 11, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'a-4', playerName: 'Greco', realTeam: 'Roma', role: 'A', initialQuote: 10, currentQuote: 14, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'a-5', playerName: 'Villa', realTeam: 'Bologna', role: 'A', initialQuote: 6, currentQuote: 10, fantasyMultiplier: 1, status: 'ACTIVE' },
  { id: 'a-6', playerName: 'Ferri', realTeam: 'Lazio', role: 'A', initialQuote: 5, currentQuote: 9, fantasyMultiplier: 1, status: 'ACTIVE' },
];

const replacement: DemoPosition = {
  id: 'p-4',
  playerName: 'Lombardi',
  realTeam: 'Lecce',
  role: 'P',
  initialQuote: 5,
  currentQuote: 9,
  fantasyMultiplier: 1,
  status: 'ACTIVE',
};

export const initialPositions: DemoPosition[] = [
  ...originalRoster,
  replacement,
];

export const initialMarketPlayers: DemoMarketPlayer[] = [
  { id: 'm-1', playerName: 'Valenti', realTeam: 'Torino', role: 'P', quote: 7, trendPct: 4.5, performancePct: 6.1, available: true },
  { id: 'm-2', playerName: 'Pellegrini', realTeam: 'Bologna', role: 'D', quote: 8, trendPct: 7.2, performancePct: 8.4, available: true },
  { id: 'm-3', playerName: 'Rossi', realTeam: 'Atalanta', role: 'C', quote: 11, trendPct: 9.4, performancePct: 11.2, available: true },
  { id: 'm-4', playerName: 'Bruno', realTeam: 'Roma', role: 'A', quote: 14, trendPct: 12.1, performancePct: 10.8, available: true },
  { id: 'm-5', playerName: 'Palmieri', realTeam: 'Como', role: 'D', quote: 6, trendPct: -2.4, performancePct: -1.8, available: true },
  { id: 'm-6', playerName: 'Caruso', realTeam: 'Juventus', role: 'C', quote: 13, trendPct: 2.2, performancePct: 4.9, available: true },
  { id: 'm-7', playerName: 'Lupo', realTeam: 'Fiorentina', role: 'A', quote: 10, trendPct: -1.1, performancePct: 3.2, available: true },
  { id: 'm-8', playerName: 'Gatti', realTeam: 'Genoa', role: 'D', quote: 5, trendPct: 5.6, performancePct: 5.9, available: true },
];

function buyCommission(grossAmount: number) {
  return grossAmount * BUY_COMMISSION_RATE;
}

function sellCommission(grossAmount: number) {
  return grossAmount * SELL_COMMISSION_RATE;
}

export function calculatePositionValue(position: Pick<DemoPosition, 'initialQuote' | 'currentQuote' | 'fantasyMultiplier' | 'status'>) {
  if (position.status === 'SOLD') return 0;
  const returnPct = (position.currentQuote - position.initialQuote) * 5;
  return Math.max(0, position.initialQuote * position.fantasyMultiplier * (1 + returnPct / 100));
}

export function withMockTrend<T extends DemoPosition | DemoMarketPlayer>(item: T): T {
  const initialQuote = 'initialQuote' in item ? item.initialQuote : item.quote;
  const currentQuote = 'currentQuote' in item ? item.currentQuote : item.quote * (1 + item.trendPct / 100);
  const fantasyMultiplier = 'fantasyMultiplier' in item ? item.fantasyMultiplier : 1;
  return {
    ...item,
    trend: item.trend ?? createMockTrend(initialQuote, currentQuote, fantasyMultiplier),
  };
}

export const demoPositions = initialPositions.map(withMockTrend);
export const demoMarketPlayers = initialMarketPlayers.map(withMockTrend);

export const initialOperations: DemoOperation[] = [
  ...originalRoster.map((position, index) => {
    const commission = buyCommission(position.initialQuote);
    return {
      id: `buy-${position.id}`,
      type: 'BUY' as OperationType,
      playerName: position.playerName,
      grossAmount: position.initialQuote,
      commission,
      netAmount: position.initialQuote + commission,
      capitalAdded: position.initialQuote + commission,
      cashBefore: 0,
      cashAfter: 0,
      round: `R${Math.max(1, Math.ceil((index + 1) / 5))}`,
    };
  }),
  {
    id: 'sell-p-1',
    type: 'SELL',
    playerName: 'Martelli',
    grossAmount: 5,
    commission: sellCommission(5),
    netAmount: 5 - sellCommission(5),
    capitalAdded: 0,
    cashBefore: 0,
    cashAfter: 5 - sellCommission(5),
    round: 'R18',
  },
  {
    id: 'buy-p-4',
    type: 'BUY',
    playerName: 'Lombardi',
    grossAmount: replacement.initialQuote,
    commission: buyCommission(replacement.initialQuote),
    netAmount: replacement.initialQuote + buyCommission(replacement.initialQuote),
    capitalAdded: buyCommission(replacement.initialQuote) + sellCommission(5),
    cashBefore: 5 - sellCommission(5),
    cashAfter: 0,
    round: 'R18',
  },
];

export const portfolioHistory: HistoryPoint[] = [
  { label: 'Start', portfolioValue: 150, roiPct: -1.96 },
  { label: 'R5', portfolioValue: 156, roiPct: 1.88 },
  { label: 'R10', portfolioValue: 162, roiPct: 5.72 },
  { label: 'R15', portfolioValue: 168, roiPct: 9.56 },
  { label: 'R20', portfolioValue: 174, roiPct: 13.14 },
  { label: 'Oggi', portfolioValue: 180, roiPct: 15.14 },
];

export const rankingExample = [
  {
    rank: 1,
    team: 'Team A - Value Scout',
    totalCapitalDeposited: 150,
    finalValue: 180,
    profitLoss: 30,
    roiPct: 20,
  },
  {
    rank: 2,
    team: 'Team B - Big Capital',
    totalCapitalDeposited: 600,
    finalValue: 660,
    profitLoss: 60,
    roiPct: 10,
  },
  {
    rank: 3,
    team: 'Team C - Balanced',
    totalCapitalDeposited: 220,
    finalValue: 237.6,
    profitLoss: 17.6,
    roiPct: 8,
  },
];

export const ruleSummary = [
  ['Rosa', '25 giocatori obbligatori: 3P / 8D / 8C / 6A.'],
  ['Capitale', 'Virtuale, variabile, senza budget massimo.'],
  ['Prezzi', '+1 punto quotazione vale +5% sul valore del giocatore.'],
  ['Commissioni', 'Acquisto e vendita applicano commissioni trattenute dal sistema.'],
  ['Trading', 'Cambi liberi nel pilot demo, sempre con saldo virtuale.'],
  ['Bonus/Malus', 'Prestazioni e regole fantasy modificano il fantasyMultiplier.'],
  ['SV', 'Policy PLAYER_ZERO_TEAM_EXCLUDE: SV escluso dalla media squadra.'],
  ['Classifica', 'Ranking principale ordinato per ROI%, non per capitale assoluto.'],
  ['Settlement', 'Chiusura contabile virtuale, nessun pagamento reale nel pilot.'],
] as const;

export const demoTeams = ['Tutte', 'Atalanta', 'Bologna', 'Inter', 'Juventus', 'Milan', 'Napoli', 'Roma', 'Torino'];
