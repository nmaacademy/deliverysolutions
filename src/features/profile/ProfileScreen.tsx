import { ReactNode, useState } from 'react';
import {
  Bell,
  ChefHat,
  ChevronRight,
  CreditCard,
  Home,
  Info,
  LayoutDashboard,
  MapPin,
  Package,
  Pencil,
  Receipt,
  SquareArrowOutUpRight,
  Tag,
  UserRound,
  LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Order } from '../../types';
import { formatTime, shortOrderId } from '../../lib/format';
import { triggerVibration } from '../../lib/haptics';
import { StaffRole, STAFF_ROLE_LABELS } from '../../lib/staffAuth';
import { openStaffTab } from '../demo/staffTabs';
import { statusMessage } from '../checkout/orderStatus';
import { CLIENT_PAGE_BOTTOM, clientTopPadding } from '../client/layout';

interface Props {
  /** Only the orders placed from this browser, never every order in the system. */
  myOrders: Order[];
  onOpenOrder: (orderId: string) => void;
  /** Demo actions have nothing to save, so they just raise a toast. */
  onDemoAction: (message: string) => void;
}

/** The three staff screens, each opened in its own tab from here. */
const STAFF_LINKS: { role: StaffRole; icon: LucideIcon; detail: string; tone: string }[] = [
  { role: 'kitchen', icon: ChefHat, detail: 'Primește și pregătește comenzile', tone: 'text-amber-400' },
  { role: 'courier', icon: Package, detail: 'Preia cursele și livrează', tone: 'text-zinc-300' },
  { role: 'admin', icon: LayoutDashboard, detail: 'Comenzi, produse și stocuri', tone: 'text-[#D4EAE6]' },
];

// Placeholder profile data. Nothing here is stored, and there is no sign-in behind it.
const DEMO_NAME = 'Client Demo';
const DEMO_PHONE = '+40 700 000 000';

const DEMO_ADDRESSES: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: Home, label: 'Acasă', detail: 'Strada Lipscani 19, București' },
  { icon: MapPin, label: 'Birou', detail: 'Calea Victoriei 100, București' },
];

const DEMO_CARDS: { label: string; detail: string }[] = [
  { label: 'Card •••• 4242', detail: 'Expiră 04/29' },
  { label: 'Numerar la livrare', detail: 'La primirea comenzii' },
];

const NOTIFICATION_TOGGLES = [
  { id: 'status', label: 'Statusul comenzii', detail: 'Anunță-mă la fiecare schimbare', initial: true },
  { id: 'offers', label: 'Oferte și noutăți', detail: 'Recomandări de la bucătărie', initial: false },
] as const;

function Section({ icon: Icon, title, action, children }: { icon: LucideIcon; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[32px] bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[#D4EAE6] shrink-0" />
        <h2 className="text-[14px] font-semibold tracking-tight text-white flex-1">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const ROW = 'w-full flex items-center gap-3 min-h-[56px] px-3 -mx-1 rounded-[20px] text-left hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]';

/** Visual-only switch: the state lives in this component and is never persisted. */
function Toggle({ label, detail, on, onToggle }: { label: string; detail: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        triggerVibration(10);
        onToggle();
      }}
      className={ROW}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-zinc-100">{label}</span>
        <span className="block text-[12px] text-zinc-500 truncate">{detail}</span>
      </span>
      <span
        aria-hidden
        className={`relative w-[46px] h-[28px] shrink-0 rounded-full border transition-colors ${
          on ? 'bg-[#D4EAE6] border-[#D4EAE6]' : 'bg-white/[0.08] border-white/15'
        }`}
      >
        <motion.span
          layout
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`absolute top-[3px] w-[20px] h-[20px] rounded-full ${on ? 'left-[23px] bg-zinc-900' : 'left-[3px] bg-zinc-300'}`}
        />
      </span>
    </button>
  );
}

export default function ProfileScreen({ myOrders, onOpenOrder, onDemoAction }: Props) {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_TOGGLES.map(item => [item.id, item.initial])),
  );

  return (
    <div className={CLIENT_PAGE_BOTTOM} style={{ paddingTop: clientTopPadding() }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-4">
        <h1 className="text-[28px] sm:text-[32px] font-sans font-semibold tracking-tight text-white">Profil</h1>

        {/* Identity card */}
        <section className="rounded-[32px] bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-5 flex items-center gap-4">
          <span
            aria-hidden
            className="w-16 h-16 shrink-0 grid place-items-center rounded-full bg-[#D4EAE6]/15 text-[#D4EAE6] border border-[#D4EAE6]/20"
          >
            <UserRound size={28} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold tracking-tight text-white truncate">{DEMO_NAME}</h2>
            <p className="text-[13px] text-zinc-400 tabular-nums">{DEMO_PHONE}</p>
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full">
              Cont demo
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDemoAction('Editarea profilului nu este disponibilă în demo')}
            aria-label="Editează profilul"
            title="Editează profilul (demo)"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.12] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
          >
            <Pencil size={17} />
          </button>
        </section>

        <button
          type="button"
          onClick={() => onDemoAction('Editarea profilului nu este disponibilă în demo')}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.08] border border-white/10 text-[14px] font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          <Pencil size={16} />
          Editează profilul
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">demo</span>
        </button>

        {/* The three staff screens used to live in a bar pinned over the customer screens. They are
            plain buttons here instead, so the demo tools stay out of the customer's way. */}
        <Section icon={SquareArrowOutUpRight} title="Interfețe demo">
          <p className="text-[12px] text-zinc-500 -mt-2 mb-3">
            Fiecare se deschide într-un tab nou, ca să poți urmări comanda în paralel.
          </p>
          <ul className="flex flex-col">
            {STAFF_LINKS.map(({ role, icon: Icon, detail, tone }) => (
              <li key={role}>
                <button
                  type="button"
                  onClick={() => {
                    triggerVibration(12);
                    if (!openStaffTab(role)) onDemoAction('Permite pop-up-urile pentru a deschide interfața în tab nou');
                  }}
                  className={ROW}
                >
                  <span aria-hidden className={`w-10 h-10 shrink-0 grid place-items-center rounded-full bg-white/[0.06] ${tone}`}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-zinc-100">{STAFF_ROLE_LABELS[role]}</span>
                    <span className="block text-[12px] text-zinc-500 truncate">{detail}</span>
                  </span>
                  <SquareArrowOutUpRight size={16} className="shrink-0 text-zinc-600" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              triggerVibration(12);
              const opened = [openStaffTab('kitchen'), openStaffTab('courier')];
              if (opened.includes(false)) onDemoAction('Permite pop-up-urile pentru a deschide toate interfețele');
            }}
            className="mt-3 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.08] border border-white/10 text-[14px] font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <SquareArrowOutUpRight size={16} />
            Deschide Bucătăria și Curierul
          </button>
        </Section>

        <Section icon={MapPin} title="Adresele mele">
          <ul className="flex flex-col">
            {DEMO_ADDRESSES.map(({ icon: Icon, label, detail }) => (
              <li key={label}>
                <button type="button" onClick={() => onDemoAction('Adresele sunt doar demonstrative')} className={ROW}>
                  <span aria-hidden className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-white/[0.06] text-[#D4EAE6]">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-zinc-100">{label}</span>
                    <span className="block text-[12px] text-zinc-500 truncate">{detail}</span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-zinc-600" />
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={CreditCard} title="Metode de plată">
          <ul className="flex flex-col">
            {DEMO_CARDS.map(({ label, detail }) => (
              <li key={label}>
                <button type="button" onClick={() => onDemoAction('Plățile nu sunt procesate în demo')} className={ROW}>
                  <span aria-hidden className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-white/[0.06] text-[#D4EAE6]">
                    <Tag size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-zinc-100">{label}</span>
                    <span className="block text-[12px] text-zinc-500 truncate">{detail}</span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-zinc-600" />
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          icon={Receipt}
          title="Comenzile mele"
          action={<span className="text-[12px] text-zinc-500 tabular-nums">{myOrders.length}</span>}
        >
          {myOrders.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-white/10 px-5 py-8 text-center text-[13px] text-zinc-500">
              Nu ai nicio comandă activă. Comenzile plasate din acest browser apar aici.
            </p>
          ) : (
            <ul className="flex flex-col">
              {myOrders.map(order => (
                <li key={order.id}>
                  <button type="button" onClick={() => onOpenOrder(order.id)} className={ROW}>
                    <span aria-hidden className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-white/[0.06] text-[#D4EAE6] text-[11px] font-bold tabular-nums">
                      #{shortOrderId(order.id)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] text-zinc-100 truncate">{statusMessage(order)}</span>
                      <span className="block text-[12px] text-zinc-500">
                        {formatTime(order.createdAt)} · {order.total} RON
                      </span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-zinc-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Bell} title="Notificări">
          <ul className="flex flex-col">
            {NOTIFICATION_TOGGLES.map(({ id, label, detail }) => (
              <li key={id}>
                <Toggle
                  label={label}
                  detail={detail}
                  on={toggles[id]}
                  onToggle={() => setToggles(current => ({ ...current, [id]: !current[id] }))}
                />
              </li>
            ))}
          </ul>
        </Section>

        <p className="flex items-start gap-2 text-[12px] text-zinc-500 leading-relaxed px-1">
          <Info size={14} className="shrink-0 mt-0.5" />
          Prototip vizual: nu există autentificare, iar datele de profil de mai sus sunt fictive și nu sunt salvate.
        </p>
      </div>
    </div>
  );
}
