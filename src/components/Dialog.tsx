'use client';
// On-page replacements for window.alert / window.confirm. Browser pop-ups are blocked in some
// phone in-app browsers (and then confirm() silently returns false), so the site never uses them.
//   if (!(await ask('Remove this notice?'))) return;
//   tell('Saved.');
//   const note = await askText('Condition on return?');   // null when cancelled
import { useEffect, useRef, useState } from 'react';

type Req = { message: string; confirm: boolean; input?: boolean; resolve: (ok: boolean, text?: string) => void };
let show: ((r: Req) => void) | null = null;

export function ask(message: string): Promise<boolean> {
  return new Promise((resolve) => (show ? show({ message, confirm: true, resolve }) : resolve(false)));
}

/** Asks for a line of text. Resolves to the text, or null if cancelled. */
export function askText(message: string): Promise<string | null> {
  return new Promise((resolve) =>
    show ? show({ message, confirm: true, input: true, resolve: (ok, text) => resolve(ok ? text ?? '' : null) }) : resolve(null)
  );
}

export function tell(message: string): Promise<void> {
  return new Promise((resolve) => (show ? show({ message, confirm: false, resolve: () => resolve() }) : resolve()));
}

/** Mounted once in the root layout. */
export function DialogHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const current = queue[0];

  useEffect(() => {
    show = (r) => setQueue((q) => [...q, r]);
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    (current.input ? textRef.current : okRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  function close(ok: boolean) {
    current.resolve(ok, textRef.current?.value);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <div
        className="dialog-card"
        role={current.confirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-describedby="dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="dialog-message" className="dialog-message">
          {current.message}
        </p>
        {current.input && (
          <input
            ref={textRef}
            className="input"
            style={{ marginBottom: '1.25rem' }}
            aria-labelledby="dialog-message"
            onKeyDown={(e) => {
              if (e.key === 'Enter') close(true);
            }}
          />
        )}
        <div className="dialog-actions">
          {current.confirm && (
            <button type="button" className="btn-secondary" onClick={() => close(false)}>
              Cancel
            </button>
          )}
          <button type="button" className="btn" ref={okRef} onClick={() => close(true)}>
            {current.input ? 'Save' : current.confirm ? 'Yes, continue' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
