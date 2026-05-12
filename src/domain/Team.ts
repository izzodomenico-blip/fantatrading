export interface Team {
  id: string;
  name: string;
  ownerName: string;
  /** Alias storico del cash disponibile; nel modello FAVC equivale a virtualCashBalance. */
  budget: number;
  /** Costo lordo delle posizioni attive acquistate. */
  initialRosterCost: number;
  /** Capitale virtuale totale depositato dall'utente. */
  totalCapitalDeposited: number;
  /** Cash virtuale disponibile, inclusi proventi vendita non reinvestiti. */
  virtualCashBalance: number;
  totalBuyCommissions: number;
  totalSellCommissions: number;
  totalCommissionsPaid: number;
  netLiquidationValue: number;
  roiPct: number;
}

export function createTeam(
  id: string,
  name: string,
  ownerName: string,
  initialBudget: number,
): Team {
  return {
    id,
    name,
    ownerName,
    budget: initialBudget,
    initialRosterCost: 0,
    totalCapitalDeposited: initialBudget,
    virtualCashBalance: initialBudget,
    totalBuyCommissions: 0,
    totalSellCommissions: 0,
    totalCommissionsPaid: 0,
    netLiquidationValue: 0,
    roiPct: 0,
  };
}

export function debitTeam(team: Team, amount: number): Team {
  if (amount > team.budget) throw new Error(`Budget insufficiente: richiesto ${amount}, disponibile ${team.budget}`);
  const nextBudget = team.budget - amount;
  return { ...team, budget: nextBudget, virtualCashBalance: nextBudget };
}

export function creditTeam(team: Team, amount: number): Team {
  const nextBudget = team.budget + amount;
  return { ...team, budget: nextBudget, virtualCashBalance: nextBudget };
}

export function addCommission(team: Team, commission: number): Team {
  return { ...team, totalCommissionsPaid: team.totalCommissionsPaid + commission };
}

export function depositCapital(team: Team, amount: number): Team {
  if (amount < 0) throw new Error(`Deposito capitale non valido: ${amount}`);
  const nextBudget = team.budget + amount;
  return {
    ...team,
    budget: nextBudget,
    virtualCashBalance: nextBudget,
    totalCapitalDeposited: team.totalCapitalDeposited + amount,
  };
}

export function addBuyCommission(team: Team, commission: number): Team {
  return {
    ...addCommission(team, commission),
    totalBuyCommissions: team.totalBuyCommissions + commission,
  };
}

export function addSellCommission(team: Team, commission: number): Team {
  return {
    ...addCommission(team, commission),
    totalSellCommissions: team.totalSellCommissions + commission,
  };
}
