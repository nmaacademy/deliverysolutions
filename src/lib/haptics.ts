export const triggerVibration = (pattern: number | number[] = 15) => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};
