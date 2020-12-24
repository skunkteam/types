import type { CustomMessage, Failure, FailureDetails, MessageDetails, OneOrMore } from '../interfaces';
import { printValue } from './print-utils';
import { checkOneOrMore } from './type-utils';

export function prependPathToDetails(failure: Failure, key: PropertyKey): OneOrMore<FailureDetails> {
    return checkOneOrMore(failure.details.map(d => ({ ...d, path: d.path ? [key, ...d.path] : [key] })));
}

export function prependContextToDetails(failure: Failure, context: string): OneOrMore<FailureDetails> {
    return checkOneOrMore(
        failure.details.map(d =>
            d.path
                ? d
                : {
                      ...d,
                      context: !d.context ? context : d.context.startsWith(context) ? d.context : `${context} ${d.context}`,
                  },
        ),
    );
}

export function addParserInputToDetails(failure: Failure, parserInput: unknown): OneOrMore<FailureDetails> {
    if (failure.details.every(d => d.path)) {
        return [{ ...failure, kind: 'report input', parserInput }, ...failure.details];
    }
    return checkOneOrMore(failure.details.map(d => (d.path ? d : { ...d, parserInput })));
}

export function evalCustomMessage(message: CustomMessage, input: unknown): MessageDetails | string | false {
    return (
        !!message &&
        (typeof message === 'function' ? { kind: 'custom message', message: message(printValue(input), input), omitInput: true } : message)
    );
}
