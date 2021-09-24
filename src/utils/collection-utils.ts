import type { Transposed } from '../interfaces.js';

export function castArray<T>(input: undefined | T | T[]): T[] {
    return input === undefined ? [] : Array.isArray(input) ? input : [input];
}

export function decodeOptionalName<Rest extends unknown[]>(args: [string, ...Rest] | Rest): [string | undefined, ...Rest] {
    return (typeof args[0] === 'string' ? args : [undefined, ...args]) as [string | undefined, ...Rest];
}

export function partition<Base, Filtered extends Base>(
    array: readonly Base[],
    filter: (value: Base) => value is Filtered,
): [Filtered[], Exclude<Base, Filtered>[]];
export function partition<Base>(array: readonly Base[], filter: (value: Base) => boolean): [Base[], Base[]];
export function partition<T>(array: readonly T[], filter: (value: T) => boolean): [T[], T[]] {
    const no: T[] = array.slice();
    return [remove(no, filter), no];
}

export function remove<Base, Filtered extends Base>(array: Base[], filter: (value: Base) => value is Filtered): Filtered[];
export function remove<Base>(array: Base[], filter: (value: Base) => boolean): Base[];
export function remove<T>(array: T[], filter: (value: T) => boolean): T[] {
    const result: T[] = [];
    for (let i = 0; i < array.length; ) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const element = array[i]!;
        if (filter(element)) {
            array.splice(i, 1);
            result.push(element);
        } else {
            i++;
        }
    }
    return result;
}

export function transpose<T extends Record<string, string>>(obj: T): Transposed<T> {
    const result = {} as Transposed<T>;
    for (const [key, value] of Object.entries(obj)) {
        result[value as T[keyof T]] = key;
    }
    return result;
}
