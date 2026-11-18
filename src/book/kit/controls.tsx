// Controls and layout for a companion diagram: the drawing on the left, what the reader can change on the right.
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useId, useMemo, type ReactNode } from 'react';
import { Segmented } from '../../ui/Segmented';
import type { Playback } from './clock';

/** A diagram's layout: the stage, then its controls and readouts (beside it on wide screens, beneath on narrow). */
export function Diagram({ stage, children }: { stage: ReactNode; children?: ReactNode }) {
  return <div className="bk-diagram">
    <div className="bk-diagram-stage">{stage}</div>
    {children && <div className="bk-diagram-controls">{children}</div>}
  </div>;
}

/** The longest reading, in characters, that sits beside a slider's label rather than on a line of its own. */
export const LONG_READING = 9;

/** A labelled slider with its value shown. */
export function Slider({ label, value, min, max, step = 1, onChange, unit, show }: { label: string; value: number; min: number; max: number; step?: number; onChange(value: number): void; unit?: string; show?(value: number): string }) {
  const id = useId();
  const say = (v: number) => (show ? show(v) : `${Number(v.toFixed(4))}${unit ? ` ${unit}` : ''}`), text = say(value);
  // Room for the longest reading the slider can give, so the label's wrapping does not jump as it moves (the value is
  // monospaced, so a character count is its width).
  const widest = useMemo(() => {
    const steps = Math.max(1, Math.round((max - min) / step)), every = Math.max(1, Math.ceil(steps / 60));
    let n = 0;
    for (let i = 0; i <= steps; i += every) n = Math.max(n, say(min + i * step).length);
    return Math.max(n, say(max).length);
    // `show` is usually an inline function, so it is left out: the range decides the widest reading.
  }, [min, max, step, unit]);
  // A short reading sits beside the label; a long one always has a line of its own, so the label keeps its width.
  return <div className={`bk-control${widest > LONG_READING ? ' is-stacked' : ''}`}>
    <label htmlFor={id}><span>{label}</span><output htmlFor={id} style={{ minWidth: `${widest}ch` }}>{text}</output></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={text} onChange={e => onChange(Number(e.target.value))}/>
  </div>;
}

/** A labelled on/off switch. */
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange(checked: boolean): void }) {
  return <label className="bk-toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/><span>{label}</span></label>;
}

/** An exclusive choice with every option visible. The value's type decides the options', so a state setter fits `onChange`. */
export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: NoInfer<T>; label: string }[]; onChange: (value: NoInfer<T>) => void }) {
  return <div className="bk-control"><span className="bk-control-label">{label}</span><Segmented label={label} options={options} value={value} onChange={onChange} className="bk-choice"/></div>;
}

/** A plain action button. */
export function Action({ children, onClick, disabled }: { children: ReactNode; onClick(): void; disabled?: boolean }) {
  return <button type="button" className="bk-button" onClick={onClick} disabled={disabled}>{children}</button>;
}

/** Play or pause, and restart, for an animated diagram. */
export function PlayBar({ play, label = 'animation' }: { play: Playback; label?: string }) {
  return <div className="bk-playbar">
    <button type="button" className="bk-button" onClick={play.toggle} aria-label={`${play.playing ? 'Pause' : 'Play'} ${label}`}>{play.playing ? <Pause size={14} aria-hidden="true"/> : <Play size={14} aria-hidden="true"/>}<span>{play.playing ? 'Pause' : 'Play'}</span></button>
    <button type="button" className="bk-button" onClick={play.restart} aria-label={`Restart ${label}`}><RotateCcw size={14} aria-hidden="true"/><span>Restart</span></button>
  </div>;
}

/** A named value the diagram reports. `tone` colours it like the thing it measures. */
export function Readout({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: 'good' | 'bad' | 'e' | 'b' | 'force' }) {
  return <div className={`bk-readout${tone ? ` bk-readout-${tone}` : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

/** A short remark inside the controls, for what the current setting means in the text. */
export function Remark({ children, tone }: { children: ReactNode; tone?: 'good' | 'bad' }) {
  return <p className={`bk-remark${tone ? ` bk-remark-${tone}` : ''}`} aria-live="polite">{children}</p>;
}
