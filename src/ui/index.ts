// Shared UI primitives (docs/ui-redesign-plan.html §07, §14). Styled with the tokens in tokens.css; import that once.
export { InfoTip, type InfoTipProps } from './InfoTip';
export { LayerList, type LayerGroup, type LayerItem, type LayerListProps } from './LayerList';
export { Plot, type PlotMarker, type PlotProps, type PlotSeries } from './Plot';
export { ParamRow, type ParamRowProps } from './ParamRow';
export { Readouts, readoutText, type Readout, type ReadoutsProps } from './Readouts';
export { Segmented, type SegmentedOption, type SegmentedProps } from './Segmented';
export { ToastProvider, useToast, type ToastAction, type ToastApi, type ToastOptions } from './Toast';
export { soloLayer, toggleLayer, type Visibility } from './layer-visibility';
export { formatValue, normalizeValue, nudgeValue, parseValue, stepDecimals } from './param-value';
export { areaPath, extent, formatNumber, linePath, nearestIndex, plotCsv, scale, ticks3, type Sample, type ScaleKind } from './plot-scale';
