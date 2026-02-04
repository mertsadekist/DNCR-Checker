import React, { useState } from 'react';
import { CheckRecord, CheckStatus } from '../types';
import { Download, Search, Filter, PhoneCall, ShieldCheck, ShieldAlert, FileJson } from 'lucide-react';
import TransactionModal from './TransactionModal';

interface CallLogsProps {
  history: CheckRecord[];
  userRole?: string;
}

const CallLogs: React.FC<CallLogsProps> = ({ history, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ALLOWED' | 'BLOCKED'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<CheckRecord | null>(null);

  const filteredHistory = history.filter(record => {
    const matchesSearch = record.phoneNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'ALLOWED' 
        ? record.status === CheckStatus.ALLOWED 
        : record.status === CheckStatus.BLOCKED || record.status === CheckStatus.ERROR;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = "ID,Timestamp,Phone Number,Status,Agent\n";
    const rows = filteredHistory.map(r => 
      `${r.id},${r.timestamp.toISOString()},${r.phoneNumber},${r.status},${r.agentName}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dncr_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
          <button 
            onClick={exportCSV}
            disabled={filteredHistory.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

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
                <option value="ALLOWED">Allowed Only</option>
                <option value="BLOCKED">Blocked Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredHistory.length === 0 ? (
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
                      <td className="px-6 py-4">
                        {record.status === CheckStatus.ALLOWED ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <ShieldCheck className="w-3 h-3" />
                            Allowed
                          </span>
                        ) : record.status === CheckStatus.BLOCKED ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ShieldAlert className="w-3 h-3" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Error
                          </span>
                        )}
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
                        {record.apiTransactions && record.apiTransactions.length > 0 ? (
                           <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-gray-400 hover:text-emerald-600 p-1 rounded-md transition-colors"
                            title="View API Transaction"
                           >
                              <FileJson className="w-4 h-4" />
                           </button>
                        ) : (
                          <span className="text-gray-300 text-xs italic">Simulated</span>
                        )}
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {filteredHistory.length} records</span>
            <span>Data retained for 24 hours</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallLogs;