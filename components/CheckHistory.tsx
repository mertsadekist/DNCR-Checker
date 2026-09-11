import React from 'react';
import { CheckRecord } from '../types';
import { Clock } from 'lucide-react';
import { StatusPill } from './statusPresentation';

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
              <th className="px-6 py-3">Call</th>
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
                  <StatusPill status={record.finalStatus} />
                </td>
                <td className={`px-6 py-4 text-xs font-semibold ${record.callPermission === 'ALLOWED' ? 'text-green-700' : 'text-red-700'}`}>
                  {record.callPermission === 'ALLOWED' ? 'Allowed' : 'Not allowed'}
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