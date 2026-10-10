import {size} from './tokens';

export type LayoutMetrics = {
  /** Width available to this screen: the window minus any content inset. */
  width: number;
  /** Window height. */
  height: number;
  /** ≥900 wide and not a landscape phone: two-column layouts. */
  isDesktop: boolean;
  /** ≥1280 wide and not a landscape phone: the three-column workspaces. */
  isWide: boolean;
  /** A phone turned on its side: wide but short, so it keeps the phone layouts. */
  isLandscapePhone: boolean;
  contentWidth: number;
};

/**
 * Breakpoints from the window, plus the short side. A large phone in landscape
 * (932x430) is wider than the desktop breakpoint but has only ~400 pt of
 * height, so the desktop panes would not fit; it keeps the phone layouts with
 * the width the turn gives it.
 */
export function layoutMetrics(
  windowWidth: number,
  windowHeight: number,
  inset: number,
): LayoutMetrics {
  const isLandscapePhone =
    windowWidth > windowHeight && windowHeight < size.landscapePhoneMaxHeight;
  // Breakpoints follow the window, so the desktop workspace does not drop to
  // the tablet layout just because a rail takes 280 pt.
  const isDesktop = !isLandscapePhone && windowWidth >= size.desktopBreakpoint;
  const isWide = !isLandscapePhone && windowWidth >= size.wideBreakpoint;
  const width = Math.max(0, windowWidth - inset);
  // Never negative: a window not measured yet reports width 0, and an SVG
  // with a negative width logs an error.
  const contentWidth = Math.max(
    0,
    Math.min(width, size.maxContent) - size.gutter * 2,
  );
  return {
    width,
    height: windowHeight,
    isDesktop,
    isWide,
    isLandscapePhone,
    contentWidth,
  };
}
