// Polyfill for React Native Dimensions API on web
// This provides the missing setDimensions function and proper event handling

let dimensions = {
  window: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    scale: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    fontScale: 1,
  },
  screen: {
    width: typeof window !== 'undefined' ? window.screen.width : 1024,
    height: typeof window !== 'undefined' ? window.screen.height : 768,
    scale: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    fontScale: 1,
  },
};

const listeners = [];

const updateDimensions = () => {
  if (typeof window === 'undefined') {
    return;
  }

  dimensions = {
    window: {
      width: window.innerWidth,
      height: window.innerHeight,
      scale: window.devicePixelRatio || 1,
      fontScale: 1,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      scale: window.devicePixelRatio || 1,
      fontScale: 1,
    },
  };

  // Notify listeners
  listeners.forEach(listener => {
    listener({
      window: dimensions.window,
      screen: dimensions.screen,
    });
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('resize', updateDimensions);
  window.addEventListener('orientationchange', updateDimensions);
}

export const get = type => dimensions[type] || dimensions.window;

export const set = newDimensions => {
  dimensions = {...dimensions, ...newDimensions};
};

export const addEventListener = (type, handler) => {
  if (type === 'change') {
    listeners.push(handler);
    return {
      remove: () => {
        const index = listeners.indexOf(handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      },
    };
  }
  return {remove: () => {}};
};

export const removeEventListener = (type, handler) => {
  if (type === 'change') {
    const index = listeners.indexOf(handler);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
};

// Provide the missing setDimensions function that react-native expects
export const setDimensions = newDimensions => {
  dimensions = {...dimensions, ...newDimensions};
};
