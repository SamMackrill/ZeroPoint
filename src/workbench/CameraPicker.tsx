import { Segmented, type SegmentedOption } from '../ui/Segmented';
import './camera-picker.css';

/** Props for CameraPicker: the lab's camera presets and the current one. */
export interface CameraPickerProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
}

/**
 * The viewport's camera presets. Wide viewports show every preset as a segmented control; below 851 px there is no room
 * beside the status label, so the same presets collapse into a compact select rather than disappearing. Both are direct
 * children of the lab's top bar (no wrapper), so the bar's own rules style the segmented control as before.
 */
export function CameraPicker<T extends string>({ options, value, onChange }: CameraPickerProps<T>) {
  return (
    <>
      <Segmented label="Camera" testId="camera" className="camera-picker-wide" options={options} value={value} onChange={onChange}/>
      <select className="camera-picker-compact" aria-label="Camera" data-testid="camera-compact" value={value} onChange={event => onChange(event.target.value as T)}>
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{typeof option.label === 'string' ? option.label : option.title ?? option.value}</option>)}
      </select>
    </>
  );
}
