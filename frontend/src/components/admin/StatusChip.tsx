interface StatusChipProps {
  status: 'processing' | 'ingested' | 'failed';
}

const statusConfig = {
  ingested: {
    label: 'Ingested',
    textColor: 'text-[var(--color-success)]',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-[var(--color-success)]',
  },
  processing: {
    label: 'Processing',
    textColor: 'text-[var(--color-warning)]',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-[var(--color-warning)] animate-pulse',
  },
  failed: {
    label: 'Failed',
    textColor: 'text-[var(--color-error)]',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-[var(--color-error)]',
  },
};

export function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1
        text-caption font-medium rounded-pill
        border ${config.bg} ${config.border} ${config.textColor}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
