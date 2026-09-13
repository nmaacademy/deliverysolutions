import { motion } from 'motion/react';

interface SegmentedControlProps {
  id: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  /** "sm" is 44px tall overall, so it lines up with a 44px round icon button next to it. */
  size?: 'md' | 'sm';
}

const SIZES = {
  md: { frame: 'rounded-[28px] p-1.5', segment: 'py-3.5 min-h-[44px] rounded-[24px] text-[11px] sm:text-xs', pill: 'rounded-[24px]' },
  sm: { frame: 'rounded-[22px] p-0.5', segment: 'py-2 min-h-[40px] rounded-[20px] text-[10px]', pill: 'rounded-[20px]' },
} as const;

export function SegmentedControl({ id, options, value, onChange, size = 'md' }: SegmentedControlProps) {
  const style = SIZES[size];

  return (
    <div className={`flex bg-zinc-800/60 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] relative w-full ${style.frame}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 relative z-10 font-medium uppercase tracking-wider transition-colors duration-300 ${style.segment} ${
            value === option.value ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'
          }`}
        >
          {option.label}
          {value === option.value && (
            <motion.div
              layoutId={`segmented-bg-${id}`}
              className={`absolute inset-0 bg-[#D4EAE6] shadow-md -z-10 ${style.pill}`}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
