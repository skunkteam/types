import { BaseTypeImpl, createType } from '../base-type';
import type { Branded, ConstraintFn, Result, TypeImpl, ValidationOptions } from '../interfaces';
import { decodeOptionalName, getDetails, isFailure, isValidIdentifier, partition, prependPathToDetails } from '../utils';

export class ArrayType<ElementType extends BaseTypeImpl<Element>, Element, ResultType extends Element[]> extends BaseTypeImpl<ResultType> {
    readonly basicType = 'array';

    constructor(readonly elementType: ElementType, readonly name = defaultName(elementType)) {
        super();
    }

    typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        const baseFailure = { type: this, value: input } as const;
        if (!Array.isArray(input)) {
            return this.createResult(input, { ...baseFailure, kind: 'invalid basic type', expected: 'array' });
        }
        const innerResults = input.map(
            (element, index): Result<Element> => {
                const innerResult = this.elementType.validate(element, options);
                return innerResult.ok ? innerResult : { ...innerResult, details: prependPathToDetails(innerResult, index) };
            },
        );
        const [failures, validResults] = partition(innerResults, isFailure);
        return this.createResult(
            !failures.length && options.mode === 'construct' ? validResults.map(r => r.value) : input,
            failures.flatMap(getDetails),
        );
    }
}

export function array<Element>(
    ...args: [name: string, elementType: BaseTypeImpl<Element>] | [elementType: BaseTypeImpl<Element>]
): TypeImpl<ArrayType<BaseTypeImpl<Element>, Element, Element[]>> {
    const [name, elementType] = decodeOptionalName(args);
    return createType(new ArrayType(elementType, name));
}

function defaultName({ name }: BaseTypeImpl<unknown>) {
    return isValidIdentifier(name) ? `${name}[]` : `Array<${name}>`;
}

// Repeated for every type implementation, because higher kinded types are currently not really supported in TypeScript.
// Known workarounds, such as: https://medium.com/@gcanti/higher-kinded-types-in-typescript-static-and-fantasy-land-d41c361d0dbe
// are problematic with regards to instance-methods (you are very welcome to try, though). Especially the following methods are
// difficult to get right using HKT:
export interface ArrayType<ElementType, Element, ResultType> {
    /**
     * Create a new instance of this Type with the given name. Creates a brand.
     *
     * @param name the new name to use in (some) error messages
     */
    withBrand<BrandName extends string>(name: BrandName): TypeImpl<ArrayType<ElementType, Element, Branded<ResultType, BrandName>>>;

    /**
     * Use an arbitrary constraint function to further restrict a type.
     */
    withConstraint<BrandName extends string>(
        name: BrandName,
        constraint: ConstraintFn<ResultType>,
    ): TypeImpl<ArrayType<ElementType, Element, Branded<ResultType, BrandName>>>;
}
