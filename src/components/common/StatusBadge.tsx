import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyle = () => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PENDING_APPROVAL':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'APPROVED':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'CONDITION_CHECK':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'CONDITION_CHECK_FAILED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'APPROVED_FOR_ISSUE':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'PARTIALLY_ISSUED':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'ISSUED':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'PASS':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'REJECTED':
      case 'FAIL':
      case 'REJECT':
      case 'INACTIVE':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'REWORK':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatted = status.replace(/_/g, ' ');

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-wide uppercase ${sizeClass} ${getStyle()}`}
    >
      {formatted}
    </span>
  );
};
