/**
 * Color utilities for generating lap-specific color schemes and data series colors
 */

// Base colors for different data series (semantically meaningful)
export const SERIES_BASE_COLORS = {
  brake: '#FF4444', // Red for braking
  throttle: '#44FF44', // Green for throttle
  rpm: '#4444FF', // Blue for RPM
  steeringWheelAngle: '#FF8844', // Orange for steering
  speed: '#8844FF', // Purple for speed
  gear: '#AAAAAA', // Gray for gear
} as const;

export type SeriesKey = keyof typeof SERIES_BASE_COLORS;

/**
 * Generates lap-specific color variations for each series
 * Creates distinct color schemes for multiple laps while maintaining semantic meaning
 *
 * @param maxLaps - Maximum number of laps to generate schemes for
 * @returns Array of color schemes, one for each lap
 */
export const generateLapColorScheme = (
  maxLaps: number = 10,
): Array<Record<string, string>> => {
  const lapSchemes: Array<Record<string, string>> = [];

  for (let lapIndex = 0; lapIndex < maxLaps; lapIndex++) {
    const lapColors: Record<string, string> = {};

    // Calculate saturation and lightness adjustments for this lap
    // Lap 0: full saturation, Lap 1: slightly reduced, etc.
    const saturationMultiplier = Math.max(0.4, 1 - lapIndex * 0.08);
    const lightnessAdjustment = lapIndex * 3; // More conservative lightening

    // Calculate hue shift factor (0 to 1, where 1 means maximum shift)
    const hueShiftFactor = Math.min(1, lapIndex * 0.2); // Gradual shift over laps

    Object.entries(SERIES_BASE_COLORS).forEach(([seriesKey, baseColor]) => {
      // Convert hex to HSL for manipulation
      const r = parseInt(baseColor.slice(1, 3), 16) / 255;
      const g = parseInt(baseColor.slice(3, 5), 16) / 255;
      const b = parseInt(baseColor.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h: number, s: number, l: number;

      l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
          default:
            h = 0;
        }
        h /= 6;
      }

      // Apply lap-specific adjustments
      s = Math.max(0.1, Math.min(1, s * saturationMultiplier));
      l = Math.max(0.1, Math.min(0.9, l + lightnessAdjustment / 100));

      // Apply hue shifting for specific series to create better color progression
      if (seriesKey === 'brake') {
        // Brake (red): shift toward orange (increase hue slightly)
        h = (h + hueShiftFactor * 0.1) % 1; // Shift red toward orange
      } else if (seriesKey === 'throttle') {
        // Throttle (green): shift toward yellow (decrease hue slightly)
        h = Math.max(0, h - hueShiftFactor * 0.1); // Shift green toward yellow
      } else if (seriesKey === 'gear') {
        // Gear (gray): shift toward warmer tones instead of just gray
        // Shift gray toward beige/warm gray
        h = (h + hueShiftFactor * 0.05) % 1; // Slight warm shift
        s = Math.max(0.05, s * (1 - hueShiftFactor * 0.5)); // Reduce saturation less aggressively
      }

      // Convert back to RGB
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) {
          t += 1;
        }
        if (t > 1) {
          t -= 1;
        }
        if (t < 1 / 6) {
          return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
          return q;
        }
        if (t < 2 / 3) {
          return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
      };

      let r2: number, g2: number, b2: number;

      if (s === 0) {
        r2 = g2 = b2 = l; // achromatic
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1 / 3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1 / 3);
      }

      const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      lapColors[seriesKey] = `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
    });

    lapSchemes.push(lapColors);
  }

  return lapSchemes;
};

// Generate color schemes for up to 10 laps
export const LAP_COLOR_SCHEMES = generateLapColorScheme(10);
