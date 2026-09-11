import type { CallPermission, DncrFinalStatus, DncrInterpretation } from './shared/dncrStatus';

export type { CallPermission, DncrFinalStatus, DncrInterpretation };

/** The dashboard's own view state, on top of the four DNCR outcomes. */
export enum CheckStage {
  IDLE = 'IDLE',
  CHECKING = 'CHECKING',
  DONE = 'DONE',
}

/** What the backend returns for a single check. */
export interface DncrResponse extends DncrInterpretation {
  phoneNumber: string;
  requestId: string;
}

export interface ApiRequestDetails {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

export interface ApiResponseDetails {
  status: number;
  statusText: string;
  body: any;
}

export interface ApiTransaction {
  request: ApiRequestDetails;
  response: ApiResponseDetails;
}

export interface CheckRecord {
  id: string;
  phoneNumber: string;
  finalStatus: DncrFinalStatus;
  callPermission: CallPermission;
  displayLabel: string;
  reason?: string;
  timestamp: Date;
  agentName: string;
  apiTransactions?: ApiTransaction[];
}

export type AppView = 'dashboard' | 'logs' | 'api_logs' | 'settings' | 'users';

export interface SalesScriptConfig {
  productName: string;
  customerSegment: string;
  tone: string;
}

export type DiagnosticStatus = 'pending' | 'success' | 'failure';

export interface DiagnosticStep {
  status: DiagnosticStatus;
  details: string;
}

export interface DiagnosticResults {
  connectivity: DiagnosticStep;
  authentication: DiagnosticStep;
  dncrCheck: DiagnosticStep;
  finalStatus: DiagnosticStatus;
  raw?: any;
}
