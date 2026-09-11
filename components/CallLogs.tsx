import React, { useState, useEffect, useCallback } from 'react';
import { CheckRecord, ApiTransaction } from '../types';
import { Download, Search, Filter, PhoneCall, AlertCircle, FileJson, RefreshCw } from 'lucide-react';
import TransactionModal from './TransactionModal';
import { getAuthHeaders } from '../services/authService';
import { DncrFinalStatus, STATUS_PRESENTATION } from '../shared/dncrStatus';
import { StatusPill } from './statusPresentation';

/**
 * Rows written before the DNCR rule update carry the old three-value status.
 * Map them onto the current outcomes so history stays readable.
 */
const LEGACY_STATUS: Record<string, DncrFinalStatus> = {
  ALLOWED: 'DNCR_NOT_REGISTERED',
  BLOCKED: 'DNCR_REGISTERED',
  ERROR: 'CHECK_FAILED',
};

interface CallLogsProps {
  userRole?: string;
}

/** A check_logs row as returned by GET /api/logs/checks. */
interface DbCheckLog {
  id: string;
  phoneNumber: string;
  status: string;
  dncrStatus: string | null;
  rawTransactionStatus?: string | null;
  callPermission?: string | null;
  appliedRule?: string | null;
  reason?: string | null;
  transactionId: string | null;
  createdAt: string;
  user?: { name?: string; email?: string };
}

/** An api_logs row as returned by GET /api/logs/checks/:id/transactions. */
interface DbApiLog {
  requestUrl: string;
  requestMethod: string;
  requestHeaders: Record<string, string>;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
}

const toRecord = (row: DbCheckLog): CheckRecord => {
  const finalStatus: DncrFinalStatus = (STATUS_PRESENTATION as any)[row.status]
    ? (row.status as DncrFinalStatus)
    : LEGACY_STATUS[row.status] ?? 'CHECK_FAILED';

  return {
    id: row.id,
    phoneNumber: row.phoneNumber,
    finalStatus,
    callPermission:
      (row.callPermission as CheckRecord['callPermission']) ??
      (finalStatus === 'DNCR_NOT_REGISTERED' ? 'ALLOWED' : 'NOT_ALLOWED'),
    displayLabel: STATUS_PRESENTATION[finalStatus].defaultLabel,
    reason: row.reason ?? undefined,
    timestamp: new Date(row.createdAt),
    agentName: row.user?.name || 'Unknown',
  };
};

const toTransaction = (row: DbApiLog): ApiTransaction => ({
  request: {
    url: row.requestUrl,
    method: row.requestMethod,
    headers: row.requestHeaders || {},
    body: row.requestBody,
  },
  response: {
    status: row.responseStatus,
    statusText: '',
    body: row.responseBody,
  },
});

const CallLogs: React.FC<CallLogsProps> = ({ userRole }) => {
  const [logs, setLogs] = useState<CheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DncrFinalStatus>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<CheckRecord | null>(null);
  const [loadingDetailsFor, setLoadingDetailsFor] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/logs/checks', { headers: { ...getAuthHeaders() } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Server returned HTTP ${res.status}`);
      setLogs((data?.logs || []).map(toRecord));
    } catch (err: any) {
      setLoadError(err.message || 'Could not load the logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // API transactions are fetched on demand - the list endpoint stays light.
  const openDetails = async (record: CheckRecord) => {
    setLoadingDetailsFor(record.id);
    try {
      const res = await fetch(`/api/logs/checks/${record.id}/transactions`, { headers: { ...getAuthHeaders() } });
      const data = await res.json().catch(() => null);
      const apiTransactions = (data?.apiLogs || []).map(toTransaction);
      setSelectedRecord({ ...record, apiTransactions });
    } catch {
      setSelectedRecord({ ...record, apiTransactions: [] });
    } finally {
      setLoadingDetailsFor(null);
    }
  };

  const filteredHistory = logs.filter(record => {
    const matchesSearch = record.phoneNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || record.finalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = "ID,Timestamp,Phone Number,Final Status,Call Permission,Label,Agent\n";
    const rows = filteredHistory.map(r =>
      [r.id, r.timestamp.toISOString(), r.phoneNumber, r.finalStatus, r.callPermission, r.displayLabel, r.agentName]
        .map(escape).join(',')
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dncr_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      {selectedRecord && (
        <TransactionModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Call Verification Logs</h1>
            <p className="text-gray-500 mt-2">Historical record of all DNCR compliance checks performed.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={filteredHistory.length === 0}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 text-red-700 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Could not load the logs: {loadError}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
              >
                <option value="ALL">All Statuses</option>
                <option value="DNCR_NOT_REGISTERED">Not Registered (Call Allowed)</option>
                <option value="DNCR_REGISTERED">DNCR Registered (Do Not Call)</option>
                <option value="UNKNOWN">Unknown (Do Not Call)</option>
                <option value="CHECK_FAILED">Check Failed (Do Not Call)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PhoneCall className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No logs found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your filters or perform a new check.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Verification ID</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Call</th>
                    <th className="px-6 py-4">Agent</th>
                    {userRole === 'ADMIN' && <th className="px-6 py-4 text-center">Details</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        {record.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.timestamp.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-900">
                        {record.phoneNumber}
                      </td>
                      <td className="px-6 py-4" title={record.reason || undefined}>
                        <StatusPill status={record.finalStatus} />
                      </td>
                      <td className={`px-6 py-4 text-xs font-semibold ${record.callPermission === 'ALLOWED' ? 'text-green-700' : 'text-red-700'}`}>
                        {record.callPermission === 'ALLOWED' ? 'Allowed' : 'Not allowed'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                            {record.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          {record.agentName}
                        </div>
                      </td>
                      {userRole === 'ADMIN' && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openDetails(record)}
                          disabled={loadingDetailsFor === record.id}
                          className="text-gray-400 hover:text-emerald-600 p-1 rounded-md transition-colors disabled:opacity-50"
                          title="View API Transaction"
                        >
                          {loadingDetailsFor === record.id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <FileJson className="w-4 h-4" />}
                        </button>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {filteredHistory.length} of {logs.length} records</span>
            <span>Live from the database - all agents, all devices</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallLogs;
