import React from 'react';
import { CheckRecord } from '../types';
import { X, Server, ArrowRight } from 'lucide-react';

interface TransactionModalProps {
  record: CheckRecord;
  onClose: () => void;
}

const JsonBlock: React.FC<{ data: any, title: string, status?: number, statusText?: string }> = ({ data, title, status, statusText }) => {
  const isSuccess = status && status >= 200 && status < 300;
  const isError = status && status >= 400;
  
  let statusColor = 'bg-gray-100 text-gray-600';
  if (isSuccess) statusColor = 'bg-green-100 text-green-700';
  if (isError) statusColor = 'bg-red-100 text-red-700';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-700">{title}</h4>
        {status && (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusColor}`}>
            {status} {statusText}
          </span>
        )}
      </div>
      <pre className="bg-gray-900 text-white p-4 rounded-lg text-xs overflow-x-auto">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
};


const TransactionModal: React.FC<TransactionModalProps> = ({ record, onClose }) => {
  if (!record.apiTransactions || record.apiTransactions.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform animate-zoom-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <Server className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Direct API Transaction Details</h3>
              <p className="text-sm text-gray-500 font-mono">{record.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {record.apiTransactions.map((tx, index) => (
            <div key={index} className="space-y-4 border-b border-gray-200 pb-6 last:pb-0 last:border-b-0">
               <div>
                 <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                   Browser to Etisalat API
                 </h4>
                 <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="font-mono text-sm text-gray-800 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      {tx.request.method}
                    </span>
                    <span className="font-mono text-sm text-gray-600 break-all">
                      {tx.request.url}
                    </span>
                 </div>
              </div>

              <JsonBlock title="Request Headers" data={tx.request.headers} />
              {tx.request.body && <JsonBlock title="Request Body" data={tx.request.body} />}

              <div className="text-center">
                <ArrowRight className="w-5 h-5 text-gray-300 inline-block" />
              </div>

              <JsonBlock 
                title="Response Body" 
                data={tx.response.body} 
                status={tx.response.status}
                statusText={tx.response.statusText}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;