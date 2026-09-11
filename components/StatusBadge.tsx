import React from 'react';
import { Loader2 } from 'lucide-react';
import { CheckStage, DncrResponse } from '../types';
import { iconFor, toneFor } from './statusPresentation';

interface StatusBadgeProps {
  stage: CheckStage;
  result?: DncrResponse | null;
  className?: string;
}

/**
 * The result card. Label and call permission both come from the interpreted
 * result, so the screen can never disagree with the recorded outcome.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ stage, result, className = '' }) => {
  if (stage === CheckStage.CHECKING) {
    return (
      <div className={`flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-200 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-semibold">Verifying with DNCR Database...</span>
      </div>
    );
  }

  if (stage !== CheckStage.DONE || !result) return null;

  const tone = toneFor(result.finalStatus);
  const Icon = iconFor(result.finalStatus);
  const allowed = result.callPermission === 'ALLOWED';

  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 border-2 rounded-xl ${tone.card} ${className}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${tone.iconWrap}`}>
        <Icon className={`w-10 h-10 ${tone.icon}`} />
      </div>

      <h3 className={`text-2xl font-bold ${tone.heading}`}>{result.displayLabel}</h3>

      <p className={`mt-2 text-sm font-semibold uppercase tracking-wide ${tone.body}`}>
        {allowed ? 'Calling permitted' : 'Calling not permitted'}
      </p>

      {result.reason && (
        <p className={`text-sm mt-3 max-w-xl ${tone.body}`}>{result.reason}</p>
      )}

      {result.finalStatus === 'DNCR_REGISTERED' && (
        <p className="text-sm text-red-500 mt-3 font-medium bg-red-100 px-2 py-1 rounded">
          Violating this warning may result in penalties.
        </p>
      )}
    </div>
  );
};

export default StatusBadge;
