import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 select-none';

  const sizes: Record<string, string> = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-body',
    lg: 'px-8 py-3 text-base',
  };

  const variants: Record<string, string> = {
    primary: isDisabled
      ? 'bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)] cursor-not-allowed'
      : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-elevation1 active:scale-95',
    secondary: isDisabled
      ? 'bg-white border border-[var(--color-outline)] text-[var(--color-text-secondary)] cursor-not-allowed'
      : 'bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] active:scale-95',
    ghost: isDisabled
      ? 'text-[var(--color-text-secondary)] cursor-not-allowed'
      : 'text-[var(--color-primary)] hover:bg-[var(--color-surface)] active:scale-95',
    danger: isDisabled
      ? 'bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)] cursor-not-allowed'
      : 'bg-[var(--color-error)] text-white hover:opacity-90 shadow-elevation1 active:scale-95',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isDisabled}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
