export enum CheckStatus {
  IDLE = 'IDLE',
  CHECKING = 'CHECKING',
  ALLOWED = 'ALLOWED',
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR'
}

export interface DncrResponse {
  phoneNumber: string;
  isDncrListed: boolean;
  listingDate?: string; // ISO Date string
  blockReason?: string;
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
  status: CheckStatus;
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

// FIX: Add Diagnostic types for ConnectionTester component
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
