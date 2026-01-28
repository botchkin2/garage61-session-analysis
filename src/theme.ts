// Racing-themed design system for Lap Analysis app
export const RacingTheme = {
  // Color palette - inspired by racing and performance
  colors: {
    // Core racing colors
    primary: '#00d4ff', // Electric blue - main accent, performance data
    secondary: '#00ff88', // Racing green - success, clean laps
    warning: '#ff073a', // Racing red - errors, off-track
    accent: '#ff9500', // Racing yellow - warnings, highlights

    // Background colors
    background: '#0a0a0a', // Deep black - main app background
    surface: '#1a1a1a', // Dark gray - cards, containers
    surfaceElevated: '#2a2a2a', // Elevated surfaces

    // Text colors
    text: '#ffffff', // Primary text - white for contrast
    textSecondary: '#b0b0b0', // Secondary text - muted
    textTertiary: '#808080', // Tertiary text - more muted

    // Status colors
    success: '#00ff88', // Clean laps, good performance
    error: '#ff073a', // Errors, off-track incidents
    info: '#00d4ff', // Information, neutral states
    caution: '#ff9500', // Warnings, incomplete laps

    // Racing-specific
    pit: '#ff9500', // Pit lane color
    track: '#404040', // Track surface color
    speed: '#00d4ff', // Speed indicators
    time: '#00ff88', // Lap times, performance
  },

  // Typography
  typography: {
    // Font families (using system fonts for reliability)
    primary: 'System', // Main font family
    mono: 'monospace', // For lap times, data

    // Font sizes
    h1: 32, // Main titles
    h2: 24, // Section headers
    h3: 20, // Card titles
    h4: 18, // Subtitles
    body: 16, // Body text
    caption: 14, // Captions, metadata
    small: 12, // Small labels

    // Font weights
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Spacing system (multiples of 4)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  // Border radius for modern look
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Shadows for depth and racing aesthetic
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
    },
    glow: {
      shadowColor: '#00d4ff',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 8,
    },
  },

  // Animation durations
  animations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

// Utility functions for consistent styling
export const getStatusColor = (
  status: 'success' | 'error' | 'warning' | 'info',
) => {
  return RacingTheme.colors[status];
};

export const getRacingColor = (type: 'speed' | 'time' | 'track' | 'pit') => {
  return RacingTheme.colors[type];
};
