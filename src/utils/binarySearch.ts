/**
 * Binary search utilities for finding closest matches in sorted arrays
 */

/**
 * Finds the index of the closest value to targetValue in a sorted Float32Array
 * Uses binary search for O(log n) performance instead of O(n) linear search
 *
 * @param sortedArray - Float32Array sorted in ascending order
 * @param targetValue - The value to find the closest match for
 * @returns Index of the closest value in the array
 */
export const findClosestIndex = (
  sortedArray: Float32Array,
  targetValue: number,
): number => {
  let left = 0;
  let right = sortedArray.length - 1;

  // Handle edge cases
  if (sortedArray.length === 0) {
    return 0;
  }
  if (sortedArray.length === 1) {
    return 0;
  }

  // Binary search for the closest match
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = sortedArray[mid];

    if (midValue === targetValue) {
      return mid;
    } else if (midValue < targetValue) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Return the closer of the two candidates
  const leftDist = Math.abs(sortedArray[Math.max(0, left - 1)] - targetValue);
  const rightDist = Math.abs(
    sortedArray[Math.min(sortedArray.length - 1, left)] - targetValue,
  );

  return leftDist <= rightDist ? Math.max(0, left - 1) : left;
};
