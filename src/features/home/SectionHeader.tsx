import { ChevronRight } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  /** Small line under the title, e.g. "Disponibil astăzi". */
  hint?: string;
  onSeeAll: () => void;
}

/** Title on the left, "Vezi tot" on the right: shared by both Home sections so they stay aligned. */
export default function SectionHeader({ id, title, hint, onSeeAll }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[19px] font-sans font-semibold tracking-tight text-white truncate">
          {title}
        </h2>
        {hint && <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{hint}</p>}
      </div>

      <button
        type="button"
        onClick={onSeeAll}
        className="shrink-0 inline-flex items-center gap-0.5 min-h-[44px] pl-3 pr-2 -mr-2 rounded-full text-[13px] font-medium text-[#D4EAE6] hover:bg-[#D4EAE6]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
      >
        Vezi tot
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
