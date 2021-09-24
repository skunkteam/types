import type { CustomMessage, Failure, FailureDetails, MessageDetails, OneOrMore } from '../interfaces.js';
import { printValue } from './print-utils.js';
import { checkOneOrMore } from './type-utils.js';

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

export function addParserInputToFailure(failure: Failure, parserInput: unknown): Failure {
    if (failure.details.every(d => d.path)) {
        return { ...failure, parserInput };
    }
    return { ...failure, details: checkOneOrMore(failure.details.map(d => (d.path ? d : { ...d, parserInput }))) };
}

export function evalCustomMessage<T, E>(message: CustomMessage<T, E>, input: T, explanation: E): MessageDetails | string | false {
    switch (typeof message) {
        case 'string':
            if (message) return message;
            break;
        case 'function': {
            const result = message(printValue(input), input, explanation);
            if (result) return { kind: 'custom message', message: result, omitInput: true };
        }
    }
    return false;
}

export function evalAdditionalChecks<K extends string, T>(
    results: Record<K, boolean>,
    customMessage: CustomMessage<T, K[]> | Partial<Record<K, CustomMessage<T, K>>>,
    input: T,
    defaultMessage: (violation: K) => MessageDetails,
): (string | MessageDetails)[] {
    const keys = Object.keys(results) as K[];
    const violations = keys.filter(key => !results[key]);
    if (typeof customMessage === 'object') {
        return violations.map(v => evalCustomMessage(customMessage[v], input, v) || defaultMessage(v));
    }
    const combinedMessage = violations.length && evalCustomMessage(customMessage, input, violations);
    return combinedMessage ? [combinedMessage] : violations.map(defaultMessage);
}
