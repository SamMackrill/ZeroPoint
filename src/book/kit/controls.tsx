// Controls and layout for a companion diagram: the drawing on the left, what the reader can change on the right.
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useId, useMemo, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
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
    // Every value the slider can take, from min in whole steps, never past max (and max itself).
    const steps = Math.max(0, Math.floor((max - min) / step + 1e-9));
    let n = say(max).length;
    for (let i = 0; i <= steps; i++) n = Math.max(n, say(Math.min(max, min + i * step)).length);
    return n;
    // `show` is usually an inline function, so it is left out: the range decides the widest reading.
  }, [min, max, step, unit]);
  // A short reading sits beside the label in room reserved for the longest; a long one always has a line of its own,
  // where it needs no reserved room and may wrap if the column is narrow.
  const stacked = widest > LONG_READING;
  return <div className={`bk-control${stacked ? ' is-stacked' : ''}`}>
    <label htmlFor={id}><span>{label}</span><output htmlFor={id} style={stacked ? undefined : { minWidth: `${widest}ch` }}>{text}</output></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={text} onChange={e => onChange(Number(e.target.value))}/>
  </div>;
}

/** How far a dial turns either side of straight up, in degrees: 270° of travel, like a panel control. */
const DIAL_SWEEP = 135;

/**
 * A rotary control, like the knob of a reversing current controller: `min` at the far left, `max` at the far right, and
 * the middle of the range straight up (off, when the range is centred on zero). Turn it by dragging round, or with the
 * arrow keys, Page Up and Page Down (ten steps), Home and End.
 */
export function Dial({ label, value, min, max, step = 1, onChange, show, marks }: { label: string; value: number; min: number; max: number; step?: number; onChange(value: number): void; show(value: number): string; marks?: [string, string, string] }) {
  const id = useId(), knob = useRef<SVGSVGElement>(null), text = show(value);
  const angleOf = (v: number) => -DIAL_SWEEP + ((v - min) / (max - min)) * 2 * DIAL_SWEEP;
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));
  const set = (v: number) => { const next = Number(snap(v).toFixed(6)); if (next !== value) onChange(next); };
  const turnTo = (e: PointerEvent<SVGSVGElement>) => {
    const box = knob.current!.getBoundingClientRect(), dx = e.clientX - (box.left + box.width / 2), dy = e.clientY - (box.top + box.height / 2);
    const a = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 straight up, clockwise positive
    if (Math.abs(a) > DIAL_SWEEP + 20) return; // the dead zone at the bottom: ignore, rather than jump end to end
    set(min + ((Math.max(-DIAL_SWEEP, Math.min(DIAL_SWEEP, a)) + DIAL_SWEEP) / (2 * DIAL_SWEEP)) * (max - min));
  };
  const keys: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: 10 * step, PageDown: -10 * step };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key in keys) set(value + keys[e.key]);
    else if (e.key === 'Home') set(min);
    else if (e.key === 'End') set(max);
    else return;
    e.preventDefault();
  };
  const at = (deg: number, r: number) => [50 + r * Math.sin((deg * Math.PI) / 180), 50 - r * Math.cos((deg * Math.PI) / 180)] as const;
  const ticks = Array.from({ length: 11 }, (_, i) => -DIAL_SWEEP + (i / 10) * 2 * DIAL_SWEEP), pointer = angleOf(value);
  const arc = (from: number, to: number, r: number) => { const [x1, y1] = at(from, r), [x2, y2] = at(to, r); return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
  const zero = min < 0 && max > 0 ? angleOf(0) : -DIAL_SWEEP;
  return <div className="bk-control bk-dial">
    <div className="bk-control-label"><span id={`${id}-label`}>{label}</span><output htmlFor={id}>{text}</output></div>
    <svg ref={knob} id={id} viewBox="0 -10 100 110" className="bk-dial-knob" role="slider" tabIndex={0} aria-labelledby={`${id}-label`}
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={text} onKeyDown={onKey}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); turnTo(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) turnTo(e); }}>
      <path d={arc(-DIAL_SWEEP, DIAL_SWEEP, 44)} className="bk-dial-track"/>
      {value !== (min < 0 && max > 0 ? 0 : min) && <path d={pointer > zero ? arc(zero, pointer, 44) : arc(pointer, zero, 44)} className="bk-dial-fill"/>}
      {ticks.map(t => { const [x1, y1] = at(t, 37), [x2, y2] = at(t, Math.abs(t) < 1 || Math.abs(t) > DIAL_SWEEP - 1 ? 31 : 34); return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} className="bk-dial-tick"/>; })}
      <circle cx={50} cy={50} r={24} className="bk-dial-cap"/>
      <line x1={at(pointer, 8)[0]} y1={at(pointer, 8)[1]} x2={at(pointer, 22)[0]} y2={at(pointer, 22)[1]} className="bk-dial-pointer"/>
      {marks && <>
        <text x={at(-DIAL_SWEEP, 30)[0] + 2} y={at(-DIAL_SWEEP, 30)[1] + 14} className="bk-dial-mark" textAnchor="middle" fontSize={8}>{marks[0]}</text>
        <text x={50} y={-2} className="bk-dial-mark" textAnchor="middle" fontSize={8}>{marks[1]}</text>
        <text x={at(DIAL_SWEEP, 30)[0] - 2} y={at(DIAL_SWEEP, 30)[1] + 14} className="bk-dial-mark" textAnchor="middle" fontSize={8}>{marks[2]}</text>
      </>}
    </svg>
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
