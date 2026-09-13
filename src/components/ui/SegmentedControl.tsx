import { useId } from 'react';
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
  md: { frame: 'p-1.5', segment: 'py-3.5 min-h-[44px] text-[11px] sm:text-xs' },
  sm: { frame: 'p-0.5', segment: 'py-2 min-h-[40px] text-[10px]' },
} as const;

export function SegmentedControl({ id, options, value, onChange, size = 'md' }: SegmentedControlProps) {
  const style = SIZES[size];
  // The same control appears on several pages with the same `id`. Keeping the layoutId unique per
  // instance stops the pill from flying across the screen from the previous page on every tab change.
  const instanceId = useId();

  return (
    <div className={`relative flex w-full rounded-full bg-zinc-800/60 glass-edge ${style.frame}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 relative z-10 rounded-full font-medium uppercase tracking-wider transition-colors duration-300 ${style.segment} ${
            value === option.value ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'
          }`}
        >
          {option.label}
          {value === option.value && (
            <motion.div
              layoutId={`segmented-bg-${id}-${instanceId}`}
              className="absolute inset-0 -z-10 rounded-full bg-[#D4EAE6] glow-opal"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
