import { BaseTypeImpl, createType } from '../base-type';
import type { Result, TypeImpl, ValidationOptions } from '../interfaces';
import { castArray, decodeOptionalName, define, getDetails, isFailure, isValidIdentifier, partition, prependPathToDetails } from '../utils';

/**
 * The implementation behind types created with {@link array}.
 */
export class ArrayType<ElementType extends BaseTypeImpl<Element>, Element, ResultType extends Element[]> extends BaseTypeImpl<ResultType> {
    readonly basicType!: 'array';

    constructor(readonly elementType: ElementType, readonly name = defaultName(elementType)) {
        super();
    }

    typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        const baseFailure = { type: this, value: input } as const;
        if (!Array.isArray(input)) {
            return this.createResult(input, undefined, { ...baseFailure, kind: 'invalid basic type', expected: 'array' });
        }
        const innerResults = input.map(
            (element, index): Result<Element> => {
                const innerResult = this.elementType.validate(element, options);
                return innerResult.ok ? innerResult : { ...innerResult, details: prependPathToDetails(innerResult, index) };
            },
        );
        const [failures, validResults] = partition(innerResults, isFailure);
        return this.createResult(
            input,
            !failures.length && options.mode === 'construct' ? validResults.map(r => r.value) : input,
            failures.flatMap(getDetails),
        );
    }
}
define(ArrayType, 'autoCaster', castArray);
define(ArrayType, 'basicType', 'array');

/**
 * Create a type that checks whether the input is an array and all elements conform to the given `elementType`.
 *
 * @param args - optional name and element-type
 */
export function array<Element>(
    ...args: [name: string, elementType: BaseTypeImpl<Element>] | [elementType: BaseTypeImpl<Element>]
): TypeImpl<ArrayType<BaseTypeImpl<Element>, Element, Element[]>> {
    const [name, elementType] = decodeOptionalName(args);
    return createType(new ArrayType(elementType, name));
}

function defaultName({ name }: BaseTypeImpl<unknown>) {
    return isValidIdentifier(name) ? `${name}[]` : `Array<${name}>`;
}
