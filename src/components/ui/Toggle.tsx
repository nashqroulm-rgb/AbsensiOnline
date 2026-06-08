import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export default function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-[34px] h-[18px] rounded-full transition-colors duration-150',
          checked ? 'bg-green-600' : 'bg-gray-300'
        )}
      >
        <span className={cn(
          'absolute top-[3px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-150',
          checked ? 'translate-x-[17px]' : 'translate-x-[3px]'
        )} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}
