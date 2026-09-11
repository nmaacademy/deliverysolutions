import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useAnimate } from 'motion/react';
import { ChevronLeft, ChefHat, Package, LayoutDashboard, QrCode, LucideIcon } from 'lucide-react';
import { StaffRole, STAFF_ROLE_LABELS, TOTP_ISSUER, secretFor, usesDemoSecret } from '../../lib/staffAuth';
import { otpauthUri, verifyTotp } from '../../lib/totp';

const ROLE_ICONS: Record<StaffRole, LucideIcon> = { kitchen: ChefHat, courier: Package, admin: LayoutDashboard };
const CODE_LENGTH = 6;

interface Props {
  role: StaffRole;
  onSuccess: () => void;
  onBack: () => void;
}

type Status = 'idle' | 'checking' | 'wrong' | 'insecure';

/** Gate in front of a staff screen: the 6-digit code from Google Authenticator / Authy for that role. */
export default function StaffLogin({ role, onSuccess, onBack }: Props) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [focused, setFocused] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate();
  const Icon = ROLE_ICONS[role];
  const label = STAFF_ROLE_LABELS[role];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (value: string) => {
    // WebCrypto only exists on HTTPS or localhost (not on a plain-HTTP LAN address).
    if (!window.crypto?.subtle) {
      setStatus('insecure');
      return;
    }
    setStatus('checking');
    if (await verifyTotp(secretFor(role), value)) {
      onSuccess();
      return;
    }
    setStatus('wrong');
    setCode('');
    animate(scope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
    inputRef.current?.focus();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (status === 'checking') return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setStatus('idle');
    if (digits.length === CODE_LENGTH) submit(digits);
  };

  const message = {
    idle: 'Introdu codul de 6 cifre din Google Authenticator sau Authy.',
    checking: 'Se verifică…',
    wrong: 'Cod greșit sau expirat. Încearcă din nou.',
    insecure: 'Verificarea codului funcționează doar pe HTTPS sau localhost.',
  }[status];
  const hasError = status === 'wrong' || status === 'insecure';

  return (
    <div className="relative isolate min-h-[100svh] flex flex-col bg-zinc-950 text-zinc-100 font-sans px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(212,234,230,0.16),transparent_70%)]"
      />

      <button
        onClick={onBack}
        aria-label="Înapoi la meniu"
        className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white transition active:scale-95"
      >
        <ChevronLeft size={20} />
      </button>

      <main className="flex-1 w-full max-w-sm mx-auto flex flex-col items-center justify-center text-center py-10">
        <div className="w-16 h-16 rounded-[22px] grid place-items-center bg-[#D4EAE6]/10 border border-[#D4EAE6]/20 text-[#D4EAE6] shadow-[0_8px_32px_rgba(212,234,230,0.12)]">
          <Icon size={28} />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Acces personal</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-white">{label}</h1>
        <p id="staff-login-hint" aria-live="polite" className={`mt-2 min-h-[42px] text-[14px] ${hasError ? 'text-red-300' : 'text-zinc-400'}`}>
          {message}
        </p>

        {/* One real input drives six display boxes, so paste and SMS/one-time-code autofill keep working. */}
        <div ref={scope} className="relative mt-6" onClick={() => inputRef.current?.focus()}>
          <div aria-hidden className="flex justify-center gap-2">
            {Array.from({ length: CODE_LENGTH }, (_, i) => {
              const active = focused && status !== 'checking' && i === Math.min(code.length, CODE_LENGTH - 1);
              return (
                <span
                  key={i}
                  className={`w-12 h-14 grid place-items-center rounded-2xl bg-white/[0.06] border text-[24px] font-semibold text-white tabular-nums transition ${
                    i === CODE_LENGTH / 2 ? 'ml-2' : ''
                  } ${
                    hasError ? 'border-red-400/60' : active ? 'border-[#D4EAE6] ring-4 ring-[#D4EAE6]/15' : 'border-white/10'
                  } ${status === 'checking' ? 'opacity-60' : ''}`}
                >
                  {code[i] ?? (active && <span className="w-[2px] h-6 rounded-full bg-[#D4EAE6] animate-pulse" />)}
                </span>
              );
            })}
          </div>
          <input
            ref={inputRef}
            value={code}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            readOnly={status === 'checking'}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={CODE_LENGTH}
            aria-label={`Cod de autentificare ${label}`}
            aria-invalid={hasError}
            aria-describedby="staff-login-hint"
            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          />
        </div>

        {usesDemoSecret(role) && (
          <div className="mt-10 w-full">
            <button
              onClick={() => setShowSetup(open => !open)}
              aria-expanded={showSetup}
              className="mx-auto flex items-center gap-2 min-h-[44px] px-4 rounded-full text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              <QrCode size={16} />
              {showSetup ? 'Ascunde configurarea' : 'Prima dată? Configurează autentificatorul'}
            </button>
            {showSetup && <AuthenticatorSetup role={role} />}
          </div>
        )}
      </main>
    </div>
  );
}

/** QR code + manual key for adding the role's account to an authenticator app (demo keys only). */
function AuthenticatorSetup({ role }: { role: StaffRole }) {
  const [svg, setSvg] = useState('');
  const secret = secretFor(role);
  const label = STAFF_ROLE_LABELS[role];

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then(qr => qr.default.toString(otpauthUri(secret, label, TOTP_ISSUER), { type: 'svg', margin: 1, color: { dark: '#09090b', light: '#ffffff' } }))
      .then(markup => !cancelled && setSvg(markup));
    return () => {
      cancelled = true;
    };
  }, [secret, label]);

  return (
    <div className="mt-4 rounded-[28px] bg-white/[0.04] border border-white/10 p-5 flex flex-col items-center">
      <div
        role="img"
        aria-label="Cod QR pentru aplicația de autentificare"
        className="w-44 h-44 rounded-2xl bg-white p-2 [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-4 text-[13px] text-zinc-400">
        Scanează codul în Google Authenticator sau Authy. Contul apare ca „{TOTP_ISSUER} ({label})”.
      </p>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sau introdu cheia manual</p>
      <code className="mt-1 font-mono text-[13px] tracking-wider text-[#D4EAE6] break-all select-all">
        {secret.match(/.{1,4}/g)?.join(' ')}
      </code>
      <p className="mt-4 text-[11px] text-amber-400/80">
        Cheie demo, vizibilă cât timp aplicația nu are server.
      </p>
    </div>
  );
}
