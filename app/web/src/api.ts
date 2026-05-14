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

export type BackendPlayerTrendPoint = {
  round: number;
  quote: number;
  quoteChange: number;
  fantaTradingReturnPct: number;
  estimatedValue: number;
  vote?: number | null;
  fantasyBonusPct?: number;
  source: 'official' | 'synthetic' | 'mock';
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

export type BackendMarketOperation = {
  id: string;
  type: 'BUY' | 'SELL';
  playerId: string;
  player?: BackendPlayer;
  grossAmount?: number;
  commissionAmount?: number;
  netAmount?: number;
  valueAtOperation?: number;
  budgetBefore?: number;
  budgetAfter?: number;
  executedAt?: string;
};

export type BackendMarketTradeResponse = {
  operation: BackendMarketOperation;
  position?: BackendPortfolio['positions'][number];
  portfolio?: BackendPortfolio;
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

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
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

  login(email: string, password: string) {
    return this.post<LoginResponse>('/auth/login', { email, password });
  }

  getMyTeams() {
    return this.request<BackendTeam[]>('/teams/my');
  }

  createTeam(input: { seasonId: string; initialVirtualCapital?: number; teamName?: string }) {
    return this.post<BackendTeam>('/teams', input);
  }

  createTeamWithRoster(input: {
    seasonId: string;
    initialVirtualCapital: number;
    playerIds: string[];
    teamName?: string;
    resetExistingDemoTeam?: boolean;
  }) {
    return this.post<BackendPortfolio>('/teams/create-with-roster', input);
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

  getPlayer(id: string) {
    return this.request<BackendPlayer>(`/players/${id}`);
  }

  getPlayerTrend(id: string, filters: { seasonId?: string } = {}) {
    return this.request<BackendPlayerTrendPoint[]>(`/players/${id}/trend`, filters);
  }

  getQuotes(filters: { seasonId?: string; role?: string; club?: string } = {}) {
    return this.request<BackendQuote[]>('/quotes', filters);
  }

  getVotes(filters: { seasonId?: string; round?: number; playerId?: string } = {}) {
    return this.request<BackendVote[]>('/votes', filters);
  }

  getMarketOperations(teamId: string) {
    return this.request<BackendMarketOperation[]>('/market/operations', { teamId });
  }

  buyPlayer(teamId: string, playerId: string) {
    return this.post<BackendMarketTradeResponse>('/market/buy', { teamId, playerId });
  }

  sellPlayer(teamId: string, input: { playerId?: string; positionId?: string }) {
    return this.post<BackendMarketTradeResponse>('/market/sell', { teamId, ...input });
  }

  private async post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          ...this.headers(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        return {
          ok: false,
          status: response.status,
          error: message ?? `Backend request failed (${response.status})`,
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
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { message?: string | string[]; error?: string };
    if (Array.isArray(payload.message)) return payload.message.join(', ');
    return payload.message ?? payload.error ?? null;
  } catch {
    return null;
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

export async function getOrCreateDemoAccessToken(baseUrl?: string, options: { forceRefresh?: boolean } = {}) {
  const existing = getStoredAccessToken();
  if (existing && !options.forceRefresh || !import.meta.env.DEV) return existing;

  const api = new FantaTradingApi({ baseUrl });
  const login = await api.login('demo@fantatrading.local', 'password');
  if (!login.ok) return null;

  window.localStorage.setItem('fantatrading_access_token', login.data.accessToken);
  return login.data.accessToken;
}
