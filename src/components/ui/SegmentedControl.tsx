import { motion } from 'motion/react';

interface SegmentedControlProps {
  id: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}

export function SegmentedControl({ id, options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex bg-zinc-800/60 backdrop-blur-2xl rounded-[28px] p-1.5 border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] relative w-full">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 relative z-10 py-3.5 min-h-[44px] rounded-[24px] font-medium text-[11px] sm:text-xs uppercase tracking-wider transition-colors duration-300 ${
            value === option.value ? 'text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'
          }`}
        >
          {option.label}
          {value === option.value && (
            <motion.div
              layoutId={`segmented-bg-${id}`}
              className="absolute inset-0 bg-[#D4EAE6] rounded-[24px] shadow-md -z-10"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
