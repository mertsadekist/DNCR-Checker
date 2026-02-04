import React from 'react';
import { CheckCircle, Ban, AlertCircle, Loader2 } from 'lucide-react';
import { CheckStatus } from '../types';

interface StatusBadgeProps {
  status: CheckStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case CheckStatus.CHECKING:
      return (
        <div className={`flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-200 ${className}`}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-semibold">Verifying with DNCR Database...</span>
        </div>
      );
    case CheckStatus.ALLOWED:
      return (
        <div className={`flex flex-col items-center justify-center text-center p-6 bg-green-50 border-2 border-green-500 rounded-xl ${className}`}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-700">Call Allowed</h3>
          <p className="text-green-600 mt-1">Number is NOT listed in DNCR.</p>
        </div>
      );
    case CheckStatus.BLOCKED:
      return (
        <div className={`flex flex-col items-center justify-center text-center p-6 bg-red-50 border-2 border-red-500 rounded-xl ${className}`}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <Ban className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-red-700">DO NOT CALL</h3>
          <p className="text-red-600 mt-1">Number IS listed in DNCR.</p>
          <p className="text-sm text-red-500 mt-2 font-medium bg-red-100 px-2 py-1 rounded">
            Violating this warning may result in penalties.
          </p>
        </div>
      );
    case CheckStatus.ERROR:
      return (
        <div className={`flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 ${className}`}>
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">System Error: Could not verify status.</span>
        </div>
      );
    default:
      return null;
  }
};

export default StatusBadge;