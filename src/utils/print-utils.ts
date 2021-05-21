import type { OneOrMore, PropertiesInfo } from '../interfaces';
import { castArray } from './collection-utils';
import { isOneOrMore, isValidIdentifier } from './type-utils';

/**
 * Print an unknown value with a given character budget (default: 50).
 *
 * @remarks
 * Note that the budget is a hint and is not guaranteed to be met. It protects against circular references.
 */
export function printValue(input: unknown, budget = 50, visited: Set<unknown> = new Set()): string {
    switch (typeof input) {
        case 'boolean':
        case 'number':
        case 'undefined':
        case 'bigint':
            return truncateString(String(input), budget);
        case 'symbol':
            return input.description ? `[Symbol: ${truncateString(input.description, budget - 10)}]` : '[Symbol]';
        case 'function':
            return `[Function: ${truncateString(input.name, budget - 12)}]`;
        case 'string':
            return truncateString(JSON.stringify(input), budget);
        case 'object':
            if (input === null) {
                return 'null';
            }
            if (visited.has(input)) {
                return '[circular]';
            }
            visited.add(input);
            if (Array.isArray(input)) {
                return isOneOrMore(input)
                    ? `[${truncateArray(input, budget - 2, (element, remaining) => printValue(element, remaining, visited))}]`
                    : '[]';
            }
            if (!input.toString || input.toString === Object.prototype.toString) {
                const entries = Object.entries(input);
                return isOneOrMore(entries)
                    ? `{ ${truncateArray(entries, budget - 4, ([key, value], remaining) => {
                          const printedKey = printKey(key);
                          return `${printedKey}: ${printValue(value, remaining - printedKey.length - 2, visited)}`;
                      })} }`
                    : '{}';
            }
            return printValue(String(input), budget, visited);
    }
}

function truncateString(str: string, budget: number) {
    if (str.length > 6 && str.length > budget) {
        const pieceSize = Math.max(Math.floor(budget / 2) - 4, 1);
        return `${str.slice(0, pieceSize)} .. ${str.slice(-pieceSize)}`;
    }
    return str;
}

function truncateArray<T>(arr: OneOrMore<T>, budget: number, printer: (element: T, budget: number) => string): string {
    if (budget <= 0) {
        return '..';
    }
    const [first, ...rest] = arr;
    let result = printer(first, budget);
    for (const element of rest) {
        const remaining = budget - result.length;
        if (remaining > 5) {
            result += `, ${printer(element, remaining)}`;
        } else {
            result += ', ..';
            break;
        }
    }
    return result;
}

/**
 * Print a property-path in a "JavaScripty way".
 */
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

/**
 * Print a property-key in a JavaScript compatible way.
 *
 * @remarks
 * This means that if the the `key` is a valid identifier it will be returned as is, otherwise it will be quoted.
 */
export function printKey(key: string): string {
    return isValidIdentifier(key) ? key : JSON.stringify(key);
}

/**
 * Try to guess the indefinite article for an English word.
 *
 * @remarks
 * Based on the excellent work in Perl's Lingua::EN::Inflect: http://search.cpan.org/perldoc/Lingua::EN::Inflect (borrowed most regexes)
 */
// istanbul ignore next because it is approximate anyway
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

export function humanList<T>(input: T | T[], lastSeparator: 'and' | 'or', map: (i: T) => string = String): string {
    const arr = castArray(input);
    const last = arr[arr.length - 1];
    if (last === undefined) return '';
    if (arr.length === 1) return map(last);
    return `${arr.slice(0, -1).map(map).join(', ')} ${lastSeparator} ${map(last)}`;
}

export function plural(amount: unknown[], thing: string, things = `${thing}s`): string {
    return amount.length === 1 ? thing : things;
}

export function defaultObjectRep(propsInfo: PropertiesInfo): string {
    const props = Object.entries(propsInfo);
    if (!props.length) {
        return '{}';
    }

    return `{ ${props.map(([key, { partial, type }]) => `${printKey(key)}${partial ? '?' : ''}: ${type.name}`).join(', ')} }`;
}

export function bracketsIfNeeded(name: string, allowedSeparator?: '|' | '&'): string {
    return isValidIdentifier(name) || evalBrackets(new PeekableIterator(name), allowedSeparator) ? name : `(${name})`;
}

export function extensionName(obj: { name: string; isDefaultName: boolean }, extension: string): string | undefined {
    return obj.isDefaultName ? undefined : `${bracketsIfNeeded(obj.name)}.${extension}`;
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

/**
 * Validate the character stream for valid bracket-pairs.
 *
 * @remarks
 * Used to determine whether to add brackets or not.
 *
 * @param chars - the peekable character iterator
 * @param allowedSeparator - an optional allowed group-separator that does not fail validation
 * @param groupEndChar - the end character for the current group, when specified we are currently inside brackets
 * @returns `true` iff brackets match up and no additional bracket is needed for clarity
 */
function evalBrackets(chars: PeekableIterator<string>, allowedSeparator?: '|' | '&', groupEndChar?: string) {
    let hasBracketGroup = false;
    while (chars.advance()) {
        switch (chars.current) {
            case groupEndChar:
                // we've reached the end of the current bracket-group
                return true;
            case '[':
            case '{':
            case '(':
            case '<':
                // consume the entire bracket-group
                if (!evalBrackets(chars, undefined, MATCHING_BRACKET[chars.current])) return false;
                hasBracketGroup = true;
                break;
            case '"':
            case "'":
                if (!evalString(chars, chars.current)) return false;
                hasBracketGroup = true;
                break;
            case '|':
            case '&':
            case ' ':
                if (!groupEndChar) {
                    // not inside brackets, so spaces and allowed separators need special care
                    if (!allowedSeparator) return false;
                    let foundSeparator;
                    do {
                        foundSeparator ||= chars.current === allowedSeparator;
                    } while (chars.next && '|& '.includes(chars.next) && chars.advance());
                    if (!foundSeparator) return false;
                }
                break;
            default:
                // when we're not inside brackets and we encounter a character after we've already encountered a bracket group,
                // then fail the validation
                if (!groupEndChar && hasBracketGroup) return false;
        }
    }
    // we've reached the end of the character-stream, return true if we're not inside brackets
    return !groupEndChar;
}

/**
 * Consume characters from the iterator until the end of string is reached.
 *
 * @param chars - the peekable character iterator
 * @param until - the end-of-string indicator to look for
 * @returns `true` iff the string terminated correctly
 */
function evalString(chars: PeekableIterator<string>, until?: string) {
    while (chars.advance()) {
        switch (chars.current) {
            case until:
                return true;
            case '\\':
                // consume the next (escaped) character
                chars.advance();
        }
    }
    return false;
}
