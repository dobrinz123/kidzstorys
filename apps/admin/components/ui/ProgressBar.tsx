import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

const colorClasses = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

export function ProgressBar({
  value,
  size = 'md',
  color = 'primary',
  showLabel = true,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          size === 'sm' ? 'h-2' : 'h-3'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            colorClasses[color]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-600 mt-1">{Math.round(clampedValue)}%</p>
      )}
    </div>
  );
}
