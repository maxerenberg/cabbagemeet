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
