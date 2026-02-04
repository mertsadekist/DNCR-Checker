import React, { useState } from 'react';
import { DiagnosticResults, DiagnosticStatus } from '../types';
import { runConnectionDiagnostics } from '../services/dncrService';
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const getStatusIcon = (status: DiagnosticStatus) => {
  switch (status) {
    case 'pending':
      return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failure':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
};

const ConnectionTester: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleRunDiagnostics = async () => {
    setIsLoading(true);
    setResults(null);
    setShowRaw(false);
    
    // Simulate initial pending state for better UX
    setResults({
      connectivity: { status: 'pending', details: 'Attempting to reach Etisalat API endpoint...' },
      authentication: { status: 'pending', details: 'Waiting for connectivity test...' },
      dncrCheck: { status: 'pending', details: 'Waiting for authentication test...' },
      finalStatus: 'pending'
    });

    const diagnosticResults = await runConnectionDiagnostics();
    
    // Create a slight delay for smoother UI transitions if one stage is very fast
    setTimeout(() => {
        setResults(diagnosticResults);
        setIsLoading(false);
    }, 500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Connection Diagnostic Tool</h3>
          <p className="text-sm text-gray-500 mt-1">
            Test the backend server's connection to the Etisalat API.
          </p>
        </div>
        <button
          onClick={handleRunDiagnostics}
          disabled={isLoading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Run Diagnostics
        </button>
      </div>

      {results && (
        <div className="mt-6 border-t border-gray-200 pt-6 animate-fade-in-up">
          <ul className="space-y-4">
            {/* Step 1: Connectivity */}
            <li className="flex items-start gap-4">
              <div className="mt-1">{getStatusIcon(results.connectivity.status)}</div>
              <div>
                <h4 className="font-semibold text-gray-800">Stage 1: Network Connectivity</h4>
                <p className={`text-sm ${results.connectivity.status === 'failure' ? 'text-red-600' : 'text-gray-500'}`}>
                  {results.connectivity.details}
                </p>
              </div>
            </li>

            {/* Step 2: Authentication */}
            <li className="flex items-start gap-4">
              <div className="mt-1">{getStatusIcon(results.authentication.status)}</div>
              <div>
                <h4 className="font-semibold text-gray-800">Stage 2: API Authentication</h4>
                <p className={`text-sm ${results.authentication.status === 'failure' ? 'text-red-600' : 'text-gray-500'}`}>
                   {results.authentication.details}
                </p>
              </div>
            </li>

            {/* Step 3: DNCR Check */}
            <li className="flex items-start gap-4">
              <div className="mt-1">{getStatusIcon(results.dncrCheck.status)}</div>
              <div>
                <h4 className="font-semibold text-gray-800">Stage 3: DNCR Endpoint Verification</h4>
                <p className={`text-sm ${results.dncrCheck.status === 'failure' ? 'text-red-600' : 'text-gray-500'}`}>
                   {results.dncrCheck.details}
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-dashed">
            <button 
              onClick={() => setShowRaw(!showRaw)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              {showRaw ? 'Hide Raw Output' : 'Show Raw Output'}
              {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRaw && (
              <pre className="mt-2 bg-slate-800 text-white p-4 rounded-lg text-xs overflow-x-auto">
                <code>{JSON.stringify(results.raw, null, 2)}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionTester;