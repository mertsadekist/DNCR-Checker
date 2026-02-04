import React, { useState, useEffect } from 'react';
import { Database, ChevronRight } from 'lucide-react';
import { getAuthHeaders } from '../services/authService';

interface DbApiLog {
  id: string;
  checkLogId: string;
  requestUrl: string;
  requestMethod: string;
  requestHeaders: Record<string, string>;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
  createdAt: string;
  checkLog?: {
    phoneNumber?: string;
    user?: { name?: string };
  };
}

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
  if (status >= 400) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const JsonBlock: React.FC<{ data: any; title: string }> = ({ data, title }) => {
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return null;
  }
  return (
    <div>
      <h4 className="font-semibold text-gray-700 text-sm mb-2">{title}</h4>
      <pre className="bg-slate-800 text-white p-4 rounded-lg text-xs overflow-x-auto">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
};

const ApiLogs: React.FC = () => {
  const [logs, setLogs] = useState<DbApiLog[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs/api', { headers: { ...getAuthHeaders() } })
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">API Logs</h1>
        <p className="text-gray-500 mt-2">A detailed record of API requests made to the Etisalat DNCR server.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No API Logs Found</h3>
            <p className="text-gray-500 mt-1">Perform a number check to generate a transaction log.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map(log => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpandedId(prev => (prev === log.id ? null : log.id))}
                    className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium text-gray-800 truncate">
                            {log.checkLog?.phoneNumber || 'N/A'}
                            {log.checkLog?.user?.name && <span className="text-gray-400 ml-2">by {log.checkLog.user.name}</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                            <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-xs font-semibold">
                              {log.requestMethod} ...{log.requestUrl.slice(log.requestUrl.lastIndexOf('/'))}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(log.responseStatus)}`}>
                        {log.responseStatus}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50/70 p-6 border-t border-gray-200 animate-fade-in-up space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-gray-800">
                            Request to: <span className="font-mono text-emerald-700">{log.requestMethod} {log.requestUrl}</span>
                          </h3>
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(log.responseStatus)}`}>
                            {log.responseStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <JsonBlock title="Request Headers" data={log.requestHeaders} />
                          <JsonBlock title="Request Body" data={log.requestBody} />
                          <div className="md:col-span-2">
                            <JsonBlock title="Response Body" data={log.responseBody} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiLogs;
