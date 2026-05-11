export interface Team {
  id: string;
  name: string;
  ownerName: string;
  budget: number;
  totalCommissionsPaid: number;
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
    totalCommissionsPaid: 0,
  };
}

export function debitTeam(team: Team, amount: number): Team {
  if (amount > team.budget) throw new Error(`Budget insufficiente: richiesto ${amount}, disponibile ${team.budget}`);
  return { ...team, budget: team.budget - amount };
}

export function creditTeam(team: Team, amount: number): Team {
  return { ...team, budget: team.budget + amount };
}

export function addCommission(team: Team, commission: number): Team {
  return { ...team, totalCommissionsPaid: team.totalCommissionsPaid + commission };
}
