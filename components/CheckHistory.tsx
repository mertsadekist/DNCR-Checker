import React from 'react';
import { CheckRecord, CheckStatus } from '../types';
import { Clock, Phone, ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';

interface CheckHistoryProps {
  history: CheckRecord[];
}

const CheckHistory: React.FC<CheckHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
        <p>No recent checks performed today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-800">Recent Verifications</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Phone Number</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Agent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-6 py-4 font-mono text-gray-900">
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
                      <AlertCircle className="w-3 h-3" />
                      Not verified
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {record.agentName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CheckHistory;