'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X, Flag, ArrowUp, ArrowDown, Minus, LoaderCircle, type LucideIcon } from 'lucide-react';
import { type Person } from '@/lib/types';
import { short } from '@/lib/presentation';
export function Mark() {
  return (
    <span className="brand-mark">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m4 20 11-16h13L17 20H4Zm3 8 8-12h13L20 28H7Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Avatar({
  person,
  size = 'small',
}: {
  person: Pick<Person, 'name' | 'id'>;
  size?: string;
}) {
  return (
    <span className={`avatar ${size} hue-${person.id.charCodeAt(0) % 5}`} title={person.name}>
      {short(person.name)}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('input,button,select,textarea,[tabindex="0"]');
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && el) {
        const nodes = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
          ),
        ).filter((n) => n.offsetParent !== null);
        const a = nodes[0],
          b = nodes.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b?.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <header>
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button className="button primary" disabled={busy} type="submit">
      {busy ? <LoaderCircle className="spin" size={16} /> : null}
      {children}
    </button>
  );
}

export function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <span>
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function Priority({ value }: { value: string }) {
  const Icon =
    value === 'Urgent' ? Flag : value === 'High' ? ArrowUp : value === 'Low' ? ArrowDown : Minus;
  return (
    <span className={`priority priority-${value.toLowerCase()}`}>
      <Icon size={12} />
      {value}
    </span>
  );
}
