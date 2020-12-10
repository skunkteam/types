import type { BasicType, Failure, FailureDetails, OneOrMore, PropertiesInfo, Result } from './interfaces';

export function printValue(input: unknown, visited: Set<unknown> = new Set()): string {
    switch (typeof input) {
        case 'bigint':
        case 'boolean':
        case 'function':
        case 'number':
        case 'symbol':
        case 'undefined':
            return String(input);
        case 'string':
            return JSON.stringify(input);
        case 'object':
            if (input === null) {
                return 'null';
            }
            if (visited.has(input)) {
                return '[circular]';
            }
            visited.add(input);
            if (Array.isArray(input)) {
                return `[${input.map(v => printValue(v, visited)).join(', ')}]`;
            }
            if (!input.toString || (input.toString === Object.prototype.toString && isPlainObject(input))) {
                const contents = Object.entries(input)
                    .map(([key, value]) => `${printKey(key)}: ${printValue(value, visited)}`)
                    .join(', ');
                return contents ? `{ ${contents} }` : '{}';
            }
            return String(input);
    }
}

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && !!value;
}

export function isOneOrMore<T>(arr: T[]): arr is OneOrMore<T> {
    return arr.length > 0;
}

export function isSingle<T>(arr: T[]): arr is [T] {
    return arr.length === 1;
}

export function hasOwnProperty<Key extends PropertyKey>(obj: Record<PropertyKey, unknown>, key: Key): obj is Record<Key, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isValidIdentifier(s: string): boolean {
    return /^[a-z_$][a-z_$0-9]*$/i.test(s);
}

export function printPath(path: Array<PropertyKey>): string {
    let result = '';
    for (const e of path) {
        if (typeof e === 'string' && isValidIdentifier(e)) {
            result += result ? `.${e}` : `${e}`;
        } else {
            result += `[${printValue(e)}]`;
        }
    }
    return result;
}

export function printKey(key: string): string {
    return isValidIdentifier(key) ? key : JSON.stringify(key);
}

export function castArray<T>(input: undefined | T | T[]): T[] {
    return input === undefined ? [] : Array.isArray(input) ? input : [input];
}

export function humanList<T>(arr: T | T[], lastSeparator: 'and' | 'or', map: (i: T) => string = String): string {
    arr = castArray(arr);
    const last = arr[arr.length - 1];
    if (!last) return '';
    if (arr.length === 1) return map(last);
    return `${arr.slice(0, -1).map(map).join(', ')} ${lastSeparator} ${map(last)}`;
}

export function prependPathToDetails(failure: Failure, key: PropertyKey): FailureDetails[] {
    return getDetails(failure).map(d => ({ ...d, path: d.path ? [key, ...d.path] : [key] }));
}

export function getDetails(failure: Failure | FailureDetails): OneOrMore<FailureDetails> {
    return 'details' in failure && isOneOrMore(failure.details) ? failure.details : [failure];
}

export function prependContextToDetails(failure: Failure | FailureDetails, context: string): FailureDetails[] {
    return getDetails(failure).map(d => ({
        ...d,
        context: !d.context ? context : d.context.startsWith(context) ? d.context : `${context} ${d.context}`,
    }));
}

export function addParserInputToDetails(failure: Failure | FailureDetails, parserInput: unknown): FailureDetails[] {
    return getDetails(failure).map(d => ({ ...d, parserInput }));
}

/**
 * Function to test if an object is a plain object, i.e. is constructed
 * by the built-in Object constructor or inherits directly from Object.prototype
 * or null. Some built-in objects pass the test, e.g. Math which is a plain object
 * and some host or exotic objects may pass also.
 */
export function isPlainObject(obj: unknown): obj is Record<string, unknown> {
    if (!isObject(obj)) {
        return false;
    }

    const proto: unknown = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null || obj.constructor === Object;
}

export function decodeOptionalName<Rest extends unknown[]>(args: [string, ...Rest] | Rest): [string | undefined, ...Rest] {
    return (typeof args[0] === 'string' ? args : [undefined, ...args]) as [string | undefined, ...Rest];
}

export function basicType(value: unknown): BasicType {
    return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

/**
 * Try to guess the indefinite article for an English word. English is unbelievably irregular! :-|
 *
 * Based on the excellent work in Perl's Lingua::EN::Inflect: http://search.cpan.org/perldoc/Lingua::EN::Inflect (borrowed most regexes)
 */
export function an(name: string): string {
    const s = name.startsWith('[') ? name.slice(1) : name;

    // Special cases
    if (/^euler|^hour(?!i)|^heir|^honest|^hono/i.test(s)) return `an ${name}`;
    if (/^[aefhilmnorsx][.-]/i.test(s)) return `an ${name}`;
    if (/^[bcdgjkpqtuvwyz]$/i.test(s)) return `a ${name}`;

    // Abbreviations
    if (/^[aefhilmnorsx][.-]/i.test(s)) return `an ${name}`;
    if (/^[a-z][.-]/i.test(s)) return `a ${name}`;

    // Consonants
    if (/^[^aeiouy]/i.test(s)) return `a ${name}`;

    // Special vowel-forms
    if (/^e[uw]/i.test(s)) return `a ${name}`;
    if (/^onc?e\b/i.test(s)) return `a ${name}`;
    if (/^uni(?:[^nmd]|mo)/i.test(s)) return `a ${name}`;
    if (/^ut[th]/i.test(s)) return `an ${name}`;
    if (/^u[bcfhjkqrst][aeiou]/i.test(s)) return `a ${name}`;

    // Vowels
    if (/^[aeiou]/i.test(s)) return `an ${name}`;

    // Handle 'y'...
    if (/^y(?:b[lor]|cl[ea]|fere|gg|p[ios]|rou|tt)/i.test(s)) return `an ${name}`;

    return `a ${name}`;
}

export function partition<Base, Filtered extends Base>(
    array: readonly Base[],
    filter: (value: Base) => value is Filtered,
): [Filtered[], Exclude<Base, Filtered>[]];
export function partition<Base>(array: readonly Base[], filter: (value: Base) => boolean): [Base[], Base[]];
export function partition<T>(array: readonly T[], filter: (value: T) => boolean): [T[], T[]] {
    const yes: T[] = [];
    const no: T[] = [];
    for (const element of array) {
        if (filter(element)) {
            yes.push(element);
        } else {
            no.push(element);
        }
    }
    return [yes, no];
}

export function isFailure(result: Result<unknown>): result is Failure {
    return !result.ok;
}

export function defaultObjectRep(propsInfo: PropertiesInfo): string {
    const props = Object.entries(propsInfo);
    if (!props.length) {
        return '{}';
    }

    return `{ ${props.map(([key, { partial, type }]) => `${printKey(key)}${partial ? '?' : ''}: ${type.name}`).join(', ')} }`;
}

export type Transposed<T extends Record<string, string>> = Record<T[keyof T], keyof T>;

export function transpose<T extends Record<string, string>>(obj: T): Transposed<T> {
    const result = {} as Transposed<T>;
    for (const [key, value] of Object.entries(obj)) {
        result[value as T[keyof T]] = key;
    }
    return result;
}

export function bracketsIfNeeded(name: string, allowedSeparator?: '|' | '&'): string {
    return isValidIdentifier(name) || evalBrackets(new PeekableIterator(name), allowedSeparator) ? name : `(${name})`;
}

class PeekableIterator<T> {
    current: T | undefined;
    next: T | undefined;
    private readonly iter: Iterator<T>;
    constructor(iterable: Iterable<T>) {
        this.iter = iterable[Symbol.iterator]();
        this.advance();
    }
    advance(): T | undefined {
        this.current = this.next;
        const iterNext = this.iter.next();
        this.next = iterNext.done ? undefined : iterNext.value;
        return this.current;
    }
}

const MATCHING_BRACKET = {
    '[': ']',
    '{': '}',
    '(': ')',
    '<': '>',
} as const;

function evalBrackets(chars: PeekableIterator<string>, allowedSeparator?: '|' | '&', endGroup?: string) {
    let hasGroup = false;
    while (chars.advance()) {
        switch (chars.current) {
            case endGroup:
                return true;
            case '[':
            case '{':
            case '(':
            case '<':
                if (!evalBrackets(chars, undefined, MATCHING_BRACKET[chars.current])) return false;
                hasGroup = true;
                break;
            case '"':
            case "'":
                if (!evalString(chars, chars.current)) return false;
                hasGroup = true;
                break;
            case '|':
            case '&':
            case ' ':
                if (!endGroup) {
                    // not inside a group, so spaces and allowed separators need special care
                    if (!allowedSeparator) return false;
                    let foundSeparator;
                    do {
                        foundSeparator ||= chars.current === allowedSeparator;
                    } while (chars.next && '|& '.includes(chars.next) && chars.advance());
                    if (!foundSeparator) return false;
                }
                break;
            default:
                if (!endGroup && hasGroup) return false;
        }
    }
    return !endGroup;
}

function evalString(chars: PeekableIterator<string>, until?: string) {
    while (chars.advance()) {
        switch (chars.current) {
            case until:
                return true;
            case '\\':
                chars.advance();
        }
    }
    return false;
}

// Using weakmap to make sure it never gets copied into a different type with `createType`.
const instanceCache = new WeakMap<any, Record<string, unknown>>();
export function cachedInstance<T>(instance: unknown, name: string, factory: () => T): T {
    let types = instanceCache.get(instance);
    if (!types) {
        instanceCache.set(instance, (types = {}));
    }
    return (types[name] ??= factory()) as T;
}
