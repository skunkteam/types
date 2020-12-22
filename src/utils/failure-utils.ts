import type { CustomMessage, Failure, FailureDetails, OneOrMore } from '../interfaces';
import { printValue } from './print-utils';
import { checkOneOrMore } from './type-utils';

export function prependPathToDetails(failure: Failure, key: PropertyKey): OneOrMore<FailureDetails> {
    return checkOneOrMore(failure.details.map(d => ({ ...d, path: d.path ? [key, ...d.path] : [key] })));
}

export function prependContextToDetails(failure: Failure, context: string): OneOrMore<FailureDetails> {
    return checkOneOrMore(
        failure.details.map(d => ({
            ...d,
            context: !d.context ? context : d.context.startsWith(context) ? d.context : `${context} ${d.context}`,
        })),
    );
}

export function addParserInputToDetails(failure: Failure, parserInput: unknown): OneOrMore<FailureDetails> {
    return checkOneOrMore(failure.details.map(d => ({ ...d, parserInput })));
}

export function evalCustomMessage(customMessage: CustomMessage, input: unknown): string | false {
    return (
        !!customMessage &&
        (typeof customMessage === 'function' ? customMessage(printValue(input)) : `${customMessage}, got: ${printValue(input)}`)
    );
}
