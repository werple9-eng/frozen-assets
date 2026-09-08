'use client';
import { useState, useEffect, useRef } from 'react';
import { TactileButton } from './tactile';
export function PhoneDial({
  dial,
  hangUp,
}: {
  dial: (key: string) => boolean;
  hangUp: () => void;
}) {
  const [status, setStatus] = useState('TONY — 7');
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Dial 7"]')
      ?.focus();
    const key = (event: Event) => {
      const digit = (event as CustomEvent<string>).detail;
      if (/^[0-9*#]$/.test(digit))
        panel.current
          ?.querySelector<HTMLButtonElement>(`[aria-label="Dial ${digit}"]`)
          ?.click();
    };
    window.addEventListener('recovery:dial-key', key);
    return () => window.removeEventListener('recovery:dial-key', key);
  }, []);
  return (
    <aside
      ref={panel}
      className="phone-dial"
      data-hud
      aria-label="Landline keypad"
    >
      <small>LINE OPEN</small>
      <h2>{status}</h2>
      <div>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(
          (key) => (
            <TactileButton
              key={key}
              aria-label={`Dial ${key}`}
              onClick={() => {
                if (!dial(key))
                  setStatus(key === '7' ? 'NO ANSWER. TRY LATER.' : key);
              }}
            >
              {key}
            </TactileButton>
          ),
        )}
      </div>
      <TactileButton className="bench-return" onClick={hangUp}>
        Hang up
      </TactileButton>
    </aside>
  );
}
