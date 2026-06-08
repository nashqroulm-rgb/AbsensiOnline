import { cn } from '../../utils/cn';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple' | 'cyan';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const dotColors: Record<BadgeVariant, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
};

export default function Badge({ variant = 'gray', children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      variantStyles[variant],
      className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    hadir: 'green', terlambat: 'amber', absen: 'red',
    izin: 'blue', libur: 'gray', sakit: 'purple', cuti: 'cyan',
    aktif: 'green', nonaktif: 'gray',
    terverifikasi: 'green', menunggu: 'amber', ditolak: 'red',
  };
  return map[status] || 'gray';
}
