/**
 * Tipi per il log di audit.
 * Usati dal futuro backend NestJS per tracciare operazioni amministrative e di mercato.
 * Append-only: nessun record di audit viene mai modificato o cancellato.
 */

export type AuditEventType =
  | 'IMPORT_QUOTES'
  | 'IMPORT_VOTES'
  | 'CALCULATE_ROUND'
  | 'RECALCULATE_ROUND'
  | 'SEASON_STATUS_CHANGE'
  | 'USER_STATUS_CHANGE'
  | 'MARKET_BUY'
  | 'MARKET_SELL'
  | 'PRIZE_ASSIGNED'
  | 'EXPORT_REPORT';

export interface AuditEvent {
  type: AuditEventType;
  userId: string;
  seasonId?: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  status: 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  executedAt: Date;
}
