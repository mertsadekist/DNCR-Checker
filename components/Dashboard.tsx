import React, { useState } from 'react';
import { Search, Phone, RotateCcw } from 'lucide-react';
import { CheckStage, CheckRecord, DncrResponse } from '../types';
import StatusBadge from './StatusBadge';
import CheckHistory from './CheckHistory';
import { checkNumberAgainstDncr } from '../services/dncrService';

interface DashboardProps {
  history: CheckRecord[];
  onCheckComplete: (record: CheckRecord) => void;
  userName?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ history, onCheckComplete, userName }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stage, setStage] = useState<CheckStage>(CheckStage.IDLE);
  const [result, setResult] = useState<DncrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to format UAE numbers as user types
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // Handle 971 prefix input
    if (numbers.startsWith('971')) {
       if (numbers.length <= 3) return numbers;
       return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
    }

    // Handle standard local format (starts with 0)
    if (numbers.startsWith('0')) {
        // Mobile (05x) - 10 digits total -> 050 123 4567
        if (numbers.startsWith('05')) {
          if (numbers.length <= 3) return numbers;
          if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
          return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
        }
        
        // Landline (02, 03, 04, 06, 07, 09) - 9 digits total -> 04 123 4567
        if (numbers.length >= 2) {
             if (numbers.length <= 2) return numbers;
             if (numbers.length <= 5) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
             return `${numbers.slice(0, 2)} ${numbers.slice(2, 5)} ${numbers.slice(5, 9)}`;
        }
    }

    return numbers;
  };

  const handleReset = () => {
    setPhoneNumber('');
    setStage(CheckStage.IDLE);
    setResult(null);
    setError(null);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean number for API and Validation
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Validation: UAE numbers (Mobile: 10 digits, Landline: 9 digits)
    const isValidUAE = /^(0\d{8,9}|971\d{8,9})$/.test(cleanNumber);

    if (!isValidUAE) {
      setError("Please enter a valid UAE number (Mobile 05x or Landline 04/07...).");
      return;
    }

    setError(null);
    setResult(null);
    setStage(CheckStage.CHECKING);

    try {
      const { dncrResponse, apiTransactions } = await checkNumberAgainstDncr(cleanNumber);

      setResult(dncrResponse);
      setStage(CheckStage.DONE);

      // Every outcome is recorded, so a number that could not be cleared
      // leaves a trace instead of quietly disappearing.
      onCheckComplete({
        id: dncrResponse.requestId,
        phoneNumber: phoneNumber, // formatted
        finalStatus: dncrResponse.finalStatus,
        callPermission: dncrResponse.callPermission,
        displayLabel: dncrResponse.displayLabel,
        reason: dncrResponse.reason,
        timestamp: new Date(),
        agentName: userName || 'Unknown',
        apiTransactions,
      });

    } catch (err: any) {
      console.error(err);
      const failure: DncrResponse = {
        phoneNumber,
        finalStatus: 'CHECK_FAILED',
        callPermission: 'NOT_ALLOWED',
        displayLabel: 'DNCR Check Failed — Do Not Call',
        reason: 'Could not reach the DNCR service, so the number was never checked.',
        rawDncrStatus: null,
        rawTransactionStatus: null,
        appliedRule: 'TECHNICAL_FAILURE',
        requestId: `err_${Date.now()}`,
      };
      setResult(failure);
      setStage(CheckStage.DONE);

      onCheckComplete({
        id: failure.requestId,
        phoneNumber,
        finalStatus: failure.finalStatus,
        callPermission: failure.callPermission,
        displayLabel: failure.displayLabel,
        reason: failure.reason,
        timestamp: new Date(),
        agentName: userName || 'Unknown',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">DNCR Checker</h1>
          <p className="text-gray-500 mt-2">
            Private internal tool for verifying numbers against the DNCR registry to ensure compliance.
          </p>
        </div>
        {stage !== CheckStage.IDLE && (
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-600 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Check
          </button>
        )}
      </div>

      <div className="space-y-6">

        {/* Checker Input */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <form onSubmit={handleCheck} className="space-y-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Customer Phone Number (Mobile or Landline)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="phone"
                className="block w-full pl-11 pr-4 py-4 text-lg border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 border bg-gray-50 transition-all placeholder-gray-400 text-gray-900"
                placeholder="e.g. 050 123 4567 or 04 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                autoComplete="off"
                disabled={stage === CheckStage.CHECKING}
              />

              <button
                type="submit"
                disabled={stage === CheckStage.CHECKING}
                className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {stage === CheckStage.CHECKING ? 'Checking...' : 'Check Status'}
                {stage === CheckStage.IDLE && <Search className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-red-600 text-sm mt-2 font-medium bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                 {error}
              </p>
            )}

          </form>
        </div>

        {/* Status Display */}
        {stage !== CheckStage.IDLE && (
          <div className="animate-fade-in-up">
            <StatusBadge stage={stage} result={result} className="w-full shadow-sm" />
          </div>
        )}

        {/* Recent Verifications - below search */}
        <CheckHistory history={history.slice(0, 5)} />

      </div>
    </div>
  );
};

export default Dashboard;