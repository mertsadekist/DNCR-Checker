import React from 'react';
import { ShieldCheck, Ban, AlertTriangle, HelpCircle } from 'lucide-react';
import { DncrFinalStatus, STATUS_PRESENTATION } from '../shared/dncrStatus';

/**
 * The one place a DNCR outcome is turned into colour and iconography.
 * Labels and tones come from shared/dncrStatus.ts - this module only decides
 * how a tone is painted, so no component restates the decision rules.
 */

interface Tone {
  pill: string;
  card: string;
  heading: string;
  body: string;
  iconWrap: string;
  icon: string;
}

const TONES: Record<'red' | 'green' | 'orange' | 'gray', Tone> = {
  red: {
    pill: 'bg-red-100 text-red-800',
    card: 'bg-red-50 border-red-500',
    heading: 'text-red-700',
    body: 'text-red-600',
    iconWrap: 'bg-red-100',
    icon: 'text-red-600',
  },
  green: {
    pill: 'bg-green-100 text-green-800',
    card: 'bg-green-50 border-green-500',
    heading: 'text-green-700',
    body: 'text-green-600',
    iconWrap: 'bg-green-100',
    icon: 'text-green-600',
  },
  orange: {
    pill: 'bg-orange-100 text-orange-800',
    card: 'bg-orange-50 border-orange-500',
    heading: 'text-orange-700',
    body: 'text-orange-700',
    iconWrap: 'bg-orange-100',
    icon: 'text-orange-600',
  },
  gray: {
    pill: 'bg-gray-200 text-gray-700',
    card: 'bg-gray-50 border-gray-400',
    heading: 'text-gray-700',
    body: 'text-gray-600',
    iconWrap: 'bg-gray-200',
    icon: 'text-gray-600',
  },
};

const ICONS: Record<DncrFinalStatus, React.ComponentType<{ className?: string }>> = {
  DNCR_REGISTERED: Ban,
  DNCR_NOT_REGISTERED: ShieldCheck,
  UNKNOWN: HelpCircle,
  CHECK_FAILED: AlertTriangle,
};

export const toneFor = (status: DncrFinalStatus): Tone =>
  TONES[STATUS_PRESENTATION[status]?.tone ?? 'gray'];

export const iconFor = (status: DncrFinalStatus) => ICONS[status] ?? AlertTriangle;

/** Compact badge for table rows. */
export const StatusPill: React.FC<{ status: DncrFinalStatus }> = ({ status }) => {
  const tone = toneFor(status);
  const Icon = iconFor(status);
  const label = STATUS_PRESENTATION[status]?.shortLabel ?? status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tone.pill}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};
