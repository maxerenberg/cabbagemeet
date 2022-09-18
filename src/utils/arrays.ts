/**
 * Returns an array from 0 to n-1
 * @param stop upper bound (exclusive)
 */
export function range(stop: number): number[];
/**
 * Returns an array from start to stop-1
 * @param start lower bound (inclusive)
 * @param stop upper bound (exclusive)
 */
export function range(start: number, stop: number): number[];
export function range(start: number, stop?: number): number[] {
  if (stop === undefined) {
    stop = start;
    start = 0;
  }
  return [...Array(stop - start).keys()].map(i => start + i);
}

export function arrayToObject(arr: string[]): { [key: string]: true } {
  const obj: { [key: string]: true } = {};
  for (const elem of arr) {
    obj[elem] = true;
  }
  return obj;
}

/**
 * Returns a flat array of 2-tuples [col, row], where each tuple is the
 * coordinates of a cell in a grid with dimensions numCols x numRows,
 * moving from left to right, top to bottom.
 * @param numRows number of rows in the grid
 * @param numCols number of columns in the grid
 */
export function flatGridCoords(numRows: number, numCols: number): [number, number][] {
  const result: [number, number][] = [];
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      result.push([col, row]);
    }
  }
  return result;
}
