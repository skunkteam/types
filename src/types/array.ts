import { BaseTypeImpl, createType } from '../base-type';
import type { ArrayTypeConfig, Result, TypeImpl, ValidationOptions, Visitor } from '../interfaces';
import {
    castArray,
    decodeOptionalName,
    define,
    evalAdditionalChecks,
    isFailure,
    isValidIdentifier,
    partition,
    prependPathToDetails,
} from '../utils';
import { unknownArray } from './unknown';

/**
 * The implementation behind types created with {@link array}.
 */
export class ArrayType<ElementType extends BaseTypeImpl<Element>, Element, ResultType extends Element[]> extends BaseTypeImpl<
    ResultType,
    ArrayTypeConfig
> {
    readonly basicType!: 'array';
    readonly isDefaultName: boolean;
    readonly name: string;

    constructor(readonly elementType: ElementType, readonly typeConfig: ArrayTypeConfig, name?: string) {
        super();
        this.isDefaultName = !name;
        this.name = name || defaultName(elementType);
    }

    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        // Is input an array?
        if (!unknownArray.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'array' });
        }

        // Do all elements satisfy the element-type?
        const innerResults = input.map((element, index): Result<Element> => {
            const innerResult = this.elementType.validate(element, options);
            return innerResult.ok ? innerResult : { ...innerResult, details: prependPathToDetails(innerResult, index) };
        });
        const [failures, validResults] = partition(innerResults, isFailure);

        // Does the array satisfy the min/max-items specs?
        const { maxLength, minLength, customMessage } = this.typeConfig;
        const failureDetails = [
            ...failures.flatMap(f => f.details),
            ...evalAdditionalChecks(
                {
                    maxLength: maxLength == null || input.length <= maxLength,
                    minLength: minLength == null || input.length >= minLength,
                },
                customMessage,
                input,
                violation => ({ kind: 'length out of range', violation, config: this.typeConfig }),
            ),
        ];

        return this.createResult(
            input,
            !failureDetails.length && options.mode === 'construct' ? validResults.map(r => r.value) : input,
            failureDetails,
        );
    }

    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitArrayType(this);
    }
}
define(ArrayType, 'autoCaster', castArray);
define(ArrayType, 'basicType', 'array');

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(ArrayType, 'createAutoCastAllType', function (this: ArrayType<BaseTypeImpl<any>, any, any[]>) {
    return createType(new ArrayType(this.elementType.autoCastAll, this.typeConfig, this.isDefaultName ? undefined : this.name).autoCast);
});

/**
 * Create a type that checks whether the input is an array and all elements conform to the given `elementType`.
 *
 * @param args - optional name and element-type
 */
export function array<Element>(
    ...args:
        | [name: string, elementType: BaseTypeImpl<Element>, typeConfig?: ArrayTypeConfig]
        | [elementType: BaseTypeImpl<Element>, typeConfig?: ArrayTypeConfig]
): TypeImpl<ArrayType<BaseTypeImpl<Element>, Element, Element[]>> {
    const [name, elementType, typeConfig] = decodeOptionalName(args);
    return createType(new ArrayType(elementType, typeConfig ?? {}, name));
}

function defaultName({ name }: BaseTypeImpl<unknown>) {
    return isValidIdentifier(name) ? `${name}[]` : `Array<${name}>`;
}
