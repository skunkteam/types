import type { BaseObjectLikeTypeImpl, BaseTypeImpl } from './base-type';
import type { BasicType, Failure, FailureDetails, OneOrMore, ValidationDetails } from './interfaces';
import { an, basicType, checkOneOrMore, humanList, isSingle, partition, plural, printKey, printPath, printValue } from './utils';

const BULLETS = ['-', '•', '‣', '◦'];
const DEFAULT_BULLET = '*';

/**
 * Creates an human-readable error report of the given failure.
 *
 * @param root - the failure to report
 */
export function reportError(root: Failure, level = -1, omitInput?: boolean): string {
    const childLevel = level + 1;
    const details = omitInput ? checkOneOrMore(root.details.map(d => (!d.path ? { ...d, omitInput: true } : d))) : root.details;
    // Make sure we get errors breadth first:
    details.sort(detailSorter);

    if (details.length === 1 && !('parserInput' in root)) {
        const [detail] = details;
        const ctx = detail.context ? `${detail.context} of ` : '';
        const msg = detail.path
            ? `error in [${root.type.name}] at ${ctx}<${printPath(detail.path)}>: `
            : root.type.name !== detail.type.name || prependWithTypeName(detail)
            ? `error in ${ctx}[${root.type.name}]: `
            : '';
        return msg + detailMessage(detail, childLevel);
    }

    let msg = `errors in [${root.type.name}]:`;
    'parserInput' in root && (msg += reportInput(root, childLevel));
    return msg + reportDetails(details, childLevel);
}

function reportDetails(details: FailureDetails[], level: number) {
    const missingProps: Record<string, OneOrMore<FailureDetails & { kind: 'missing property' }>> = {};
    for (const detail of details) {
        if (detail.kind === 'missing property') {
            const path = detail.path ? printPath(detail.path) : '';
            missingProps[path]?.push(detail) || (missingProps[path] = [detail]);
        }
    }
    const bullet = newBullet(level);
    let msg = '';
    for (const [path, missingPropDetails] of Object.entries(missingProps)) {
        msg += `${bullet} `;
        if (path) {
            msg += `at <${path}>: `;
        }
        msg += missingPropertyMessage(missingPropDetails);
    }
    const otherDetails = details.filter(d => d.kind !== 'missing property');
    for (const detail of otherDetails) {
        msg += `${bullet} ${detailMessageWithContext(detail, level)}`;
    }
    return msg;
}

function reportInput(failure: Failure | FailureDetails, level: number) {
    return `\n${indent(level)}(${maybePrintInputValue(failure, '')})`;
}

function newBullet(level: number) {
    return `${level ? '\n' : '\n\n'}${indent(level)}${BULLETS[level] || DEFAULT_BULLET}`;
}

function indent(level: number) {
    return '  '.repeat(level);
}

function detailMessageWithContext(detail: FailureDetails, level: number) {
    return (
        (detail.context ? `in ${detail.context}` : '') +
        (detail.context && detail.path ? ' ' : '') +
        (detail.path ? `at <${printPath(detail.path)}>` : '') +
        (detail.context || detail.path ? ': ' : '') +
        detailMessage(detail, level)
    );
}

function detailMessage(detail: FailureDetails, level: number) {
    switch (detail.kind) {
        case undefined:
            return `expected ${an(`[${detail.type.name}]`)}${maybePrintInputValue(detail)}`;
        case 'missing property':
            return missingPropertyMessage([detail]);
        case 'invalid key': {
            const msg: string = isSingle(detail.failure.details)
                ? detailMessage(detail.failure.details[0], level + 1)
                : reportDetails(detail.failure.details, level + 1);
            return `key <${printKey(detail.property)}> is invalid: ${msg}`;
        }
        case 'invalid literal':
            return Array.isArray(detail.expected)
                ? `expected one of the literals ${humanList(detail.expected, 'or', printValue)}${maybePrintInputValue(detail)}`
                : `expected the literal ${printValue(detail.expected)}${maybePrintInputValue(detail)}`;
        case 'invalid basic type': {
            const expected = printBasicTypeAndValue(detail.expected, 'expectedValue' in detail ? printValue(detail.expectedValue) : '');
            const printedValue = printValue(detail.input);
            const got = printBasicTypeAndValue(basicType(detail.input), printedValue);
            return `expected ${expected}, got ${got}${maybePrintParserInput(detail, printedValue)}`;
        }
        case 'union':
            return unionMessage(detail, level);
        case 'custom message':
            return `${detail.message}${maybePrintInputValue(detail)}`;
    }
}

function maybePrintInputValue(details: FailureDetails | Failure, separator = ', ') {
    if ('omitInput' in details && details.omitInput) {
        return '';
    }
    const printedValue = printValue(details.input);
    return `${separator}got: ${printedValue}${maybePrintParserInput(details, printedValue)}`;
}

function maybePrintParserInput(details: FailureDetails | Failure, printedValue: string) {
    if ('parserInput' in details) {
        const printedParserInput = printValue(details.parserInput);
        if (printedParserInput !== printedValue) return `, parsed from: ${printedParserInput}`;
    }
    return '';
}

function printBasicTypeAndValue(bt: BasicType | BasicType[], printedValue?: string) {
    const first = Array.isArray(bt) ? bt[0] : bt;
    return `${humanList(bt, 'or', an)}${printedValue && printedValue !== first ? ` (${printedValue})` : ''}`;
}

function prependWithTypeName(detail: FailureDetails) {
    return (
        detail.context ||
        (detail.kind &&
            (detail.kind !== 'invalid literal' || Array.isArray(detail.expected)) &&
            (detail.kind !== 'invalid basic type' || !('expectedValue' in detail)))
    );
}

function missingPropertyMessage(details: OneOrMore<FailureDetails & { kind: 'missing property' }>) {
    return `missing ${plural(details, 'property', 'properties')} ${humanList(
        details,
        'and',
        d => `<${printKey(d.property)}> [${d.type.name}]`,
    )}${maybePrintInputValue(details[0])}`;
}

function unionMessage(detail: FailureDetails & { kind: 'union' }, level: number): string {
    const { type, input, failures } = detail;
    const failureBase: ValidationDetails = { type, input };
    'parserInput' in detail && (failureBase.parserInput = detail.parserInput);
    const [topLevelFailures, nonTopLevelFailures] = partition(failures, isTopLevelFailure);
    const [wrongBasicTypes, otherTopLevelFailures] = partition(topLevelFailures, hasKind('invalid basic type'));
    const details: FailureDetails[] = [];
    if (wrongBasicTypes.length) {
        details.push(
            msg(
                `disregarded ${wrongBasicTypes.length} ${plural(wrongBasicTypes, 'union-subtype')} that ${plural(
                    wrongBasicTypes,
                    'does',
                    'do',
                )} not accept ${an(basicType(input))}`,
            ),
        );
    }
    // let remainingFailures: Failure[];
    if (!nonTopLevelFailures.length) {
        if (!otherTopLevelFailures.length) {
            // no need for additional details here
            return detailMessageWithContext(
                {
                    ...failureBase,
                    kind: 'invalid basic type',
                    expected: [...new Set(wrongBasicTypes.flatMap(d => d.details[0].expected))].sort(),
                },
                level + 1,
            );
        }
        if (isSingle(otherTopLevelFailures)) {
            return printSingleMessage({
                ...otherTopLevelFailures[0].details[0],
                context: `union element [${otherTopLevelFailures[0].type.name}]`,
            });
        }
        if (otherTopLevelFailures.every(hasKind('invalid literal'))) {
            return printSingleMessage({
                ...failureBase,
                kind: 'invalid literal',
                expected: otherTopLevelFailures.flatMap(f => f.details[0].expected),
                context: 'subset of union',
            });
        }
    }
    const [withDiscriminatorMismatch, otherNonTopLevelFailures] = partition(
        [...otherTopLevelFailures, ...nonTopLevelFailures],
        hasDiscriminatorMismatch,
    );
    const mismatchedDiscriminators = withDiscriminatorMismatch.map(fail => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const detail = fail.details.find(isDiscriminatorMismatchForType(fail.type))!;
        return { type: fail.type, path: detail.path, detail };
    });
    if (!otherNonTopLevelFailures.length) {
        // TODO: make first-class failure kind
        for (const mismatch of mismatchedDiscriminators) {
            const requiredValues = humanList(
                mismatch.detail.kind === 'invalid literal' ? mismatch.detail.expected : mismatch.detail.expectedValue,
                'or',
                printValue,
            );
            details.push(
                msg(
                    `[${mismatch.type.name}] requires <${printPath(mismatch.path)}> to be ${requiredValues}${maybePrintInputValue(
                        mismatch.detail,
                    )}`,
                ),
            );
        }
        return printSingleMessage({
            ...failureBase,
            kind: 'custom message',
            message: `every subtype of union has at least one discriminator mismatch`,
            omitInput: true,
        });
    }
    if (mismatchedDiscriminators.length) {
        const mismatchedDiscriminatorPaths = [...new Set(mismatchedDiscriminators.map(d => printPath(d.path)))];
        details.push(
            msg(
                `disregarded ${mismatchedDiscriminators.length} ${plural(
                    mismatchedDiscriminators,
                    'union-subtype',
                )} due to a mismatch in values of ${plural(mismatchedDiscriminatorPaths, 'discriminator')} ${humanList(
                    mismatchedDiscriminatorPaths,
                    'and',
                    p => `<${p}>`,
                )}`,
            ),
        );
    }
    if (isSingle(otherNonTopLevelFailures)) {
        const detailsOfSingleFailure = otherNonTopLevelFailures[0].details;
        const context = `union element [${otherNonTopLevelFailures[0].type.name}]`;
        if (isSingle(detailsOfSingleFailure)) {
            return printSingleMessage({ ...detailsOfSingleFailure[0], context });
        }
        return reportDetails([...otherNonTopLevelFailures[0].details.map(d => ({ ...d, context })), ...details], level + 1);
    }

    const bullet = newBullet(level + 1);
    return (
        detailMessageWithContext(
            { ...failureBase, kind: 'custom message', message: 'failed every element in union:', omitInput: true },
            level + 1,
        ) +
        reportInput(detail, level) +
        otherNonTopLevelFailures.map(f => `${bullet} ${reportError(f, level + 1, true)}`).join('') +
        (details.length ? reportDetails(details, level + 1) : '')
    );

    function msg(message: string): FailureDetails {
        return { type, input, kind: 'custom message', message, omitInput: true };
    }

    function printSingleMessage(mainDetail: FailureDetails) {
        let msg = detailMessageWithContext(mainDetail, level + 1);
        if (details.length) msg += reportDetails(details, level + 1);
        return msg;
    }
}

function isTopLevelFailure(fail: Failure): fail is Failure & { details: [FailureDetails] } {
    return fail.details.length === 1 && !fail.details[0]?.path;
}

function hasDiscriminatorMismatch(fail: Failure) {
    return fail.details.some(isDiscriminatorMismatchForType(fail.type));
}

function isDiscriminatorMismatchForType(type: BaseTypeImpl<unknown> | BaseObjectLikeTypeImpl<unknown>) {
    const possibleDiscriminatorPaths = 'possibleDiscriminators' in type && type.possibleDiscriminators.map(d => printPath(d.path));
    return (detail: FailureDetails): detail is FailureDetails & { path: PropertyKey[]; kind: 'invalid literal' | 'invalid basic type' } =>
        !!possibleDiscriminatorPaths &&
        !!detail.path?.length &&
        (detail.kind === 'invalid literal' || (detail.kind === 'invalid basic type' && 'expectedValue' in detail)) &&
        possibleDiscriminatorPaths.includes(printPath(detail.path));
}

function hasKind<K extends FailureDetails['kind']>(kind: K) {
    return (failure: Failure & { details: [FailureDetails] }): failure is Failure & { details: [FailureDetails & { kind: K }] } =>
        failure.details[0].kind === kind;
}

function detailSorter(a: FailureDetails, b: FailureDetails) {
    return (a.path?.length || 0) - (b.path?.length || 0);
}
