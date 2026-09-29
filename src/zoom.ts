export type Zoom = 'width' | 'page' | number;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const ZOOM_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];

export function fitScale(mode: Zoom, pageWidth: number, pageHeight: number, width: number, height: number) {
  if (typeof mode === 'number') return mode;
  // ResizeObserver gives the content box, already excluding padding and gutters.
  // Leave one CSS pixel for fractional layout rounding; don't impose a minimum
  // percentage on automatic fitting, since engineering sheets can be very large.
  const horizontal = Math.max(1, width - 1) / pageWidth;
  return mode === 'width' ? horizontal : Math.min(horizontal, Math.max(1, height - 1) / pageHeight);
}

export function stepZoom(scale: number, direction: 1 | -1) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(scale * (direction === 1 ? 1.25 : 0.8) * 10000) / 10000));
}
