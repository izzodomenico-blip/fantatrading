export type ApiMode = 'connected' | 'demo' | 'backend-unavailable' | 'missing-token' | 'no-team';

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status?: number };

export type BackendTeam = {
  id: string;
  userId: string;
  seasonId: string;
  status: string;
  initialBudget?: number;
  availableBudget?: number;
  currentPortfolioValue?: number;
  currentRoi?: number;
};

export type BackendPlayer = {
  id: string;
  externalId?: string | null;
  firstName?: string;
  lastName?: string;
  role: string;
  realTeam?: string;
  isActive?: boolean;
  quotes?: BackendQuote[];
};

export type BackendQuote = {
  id?: string;
  seasonId: string;
  playerId: string;
  initialQuote: number;
  currentQuote: number;
  finalQuote?: number | null;
  player?: BackendPlayer;
};

export type BackendVote = {
  id?: string;
  seasonId?: string;
  round: number;
  playerId: string;
  vote?: number | null;
  fantasyVote?: number | null;
  played?: boolean;
};

export type BackendPortfolio = {
  team: BackendTeam;
  positions: Array<{
    id: string;
    teamId: string;
    playerId: string;
    role: string;
    playerName: string;
    initialQuote: number;
    currentQuote: number;
    buyPrice?: number;
    currentValue: number;
    fantasyMultiplier: number;
    isActive: boolean;
  }>;
  summary: {
    totalCapitalDeposited?: number;
    virtualCashBalance?: number;
    netLiquidationValue?: number;
    finalLiquidationValue?: number;
    currentPortfolioValue?: number;
    currentRoi?: number;
    roiPct?: number;
    profitLoss?: number;
    playerCount?: number;
  };
};

export type BackendFinalSettlement = {
  teamId: string;
  totalCapitalDeposited: number;
  virtualCashBalance: number;
  netLiquidationValue: number;
  finalLiquidationValue: number;
  profitLoss: number;
  roiPct: number;
  rankByRoi?: number | null;
  persisted?: boolean;
  stable?: boolean;
};

type QueryValue = string | number | boolean | undefined | null;

export class FantaTradingApi {
  readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: { baseUrl?: string; token?: string | null } = {}) {
    this.baseUrl = (options.baseUrl ?? import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    this.token = options.token ?? undefined;
  }

  private headers() {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(path: string, query?: Record<string, QueryValue>): Promise<ApiResult<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    try {
      const response = await fetch(url, { headers: this.headers() });
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: `Backend request failed (${response.status})`,
        };
      }

      return {
        ok: true,
        status: response.status,
        data: await response.json() as T,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Backend non disponibile',
      };
    }
  }

  health() {
    return this.request<{ status: string; appName?: string; version?: string }>('/health');
  }

  getMyTeams() {
    return this.request<BackendTeam[]>('/teams/my');
  }

  getTeam(id: string) {
    return this.request<BackendTeam>(`/teams/${id}`);
  }

  getTeamPortfolio(id: string) {
    return this.request<BackendPortfolio>(`/teams/${id}/portfolio`);
  }

  getTeamFinalSettlement(id: string) {
    return this.request<BackendFinalSettlement>(`/teams/${id}/final-settlement`);
  }

  getPlayers(filters: { seasonId?: string; role?: string; club?: string; search?: string } = {}) {
    return this.request<BackendPlayer[]>('/players', filters);
  }

  getQuotes(filters: { seasonId?: string; role?: string; club?: string } = {}) {
    return this.request<BackendQuote[]>('/quotes', filters);
  }

  getVotes(filters: { seasonId?: string; round?: number; playerId?: string } = {}) {
    return this.request<BackendVote[]>('/votes', filters);
  }
}

export function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('fantatrading_access_token') ??
    window.localStorage.getItem('ft_access_token') ??
    window.localStorage.getItem('accessToken')
  );
}

export function createFantaTradingApi() {
  return new FantaTradingApi({ token: getStoredAccessToken() });
}
