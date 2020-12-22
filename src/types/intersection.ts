import { BaseObjectLikeTypeImpl, createType } from '../base-type';
import type {
    LiteralValue,
    MergeIntersection,
    OneOrMore,
    Properties,
    PropertiesInfo,
    Result,
    TypeImpl,
    TypeLink,
    TypeOf,
    ValidationOptions,
} from '../interfaces';
import {
    bracketsIfNeeded,
    decodeOptionalName,
    defaultObjectRep,
    define,
    extensionName,
    humanList,
    isFailure,
    isObject,
    partition,
} from '../utils';
import { UnionType } from './union';

/**
 * The implementation behind types created with {@link intersection} and {@link BaseObjectLikeTypeImpl.and}.
 */
export class IntersectionType<Types extends OneOrMore<BaseObjectLikeTypeImpl<unknown>>> extends BaseObjectLikeTypeImpl<
    IntersectionOfTypeTuple<Types>
> {
    readonly name: string;
    readonly basicType!: 'object';
    readonly isDefaultName: boolean;

    constructor(readonly types: Types, name?: string) {
        super();
        this.isDefaultName = !name;
        this.name = name || defaultName(types);
        checkBasicTypes(types);
        checkOverlap(types);
    }

    // TODO: Support overlapping properties
    readonly props = Object.assign({}, ...this.types.map(type => type.props)) as PropertiesOfTypeTuple<Types>;
    readonly propsInfo = Object.assign({}, ...this.types.map(type => type.propsInfo)) as PropertiesInfo<PropertiesOfTypeTuple<Types>>;
    readonly combinedName = combinedName(this.types);
    readonly possibleDiscriminators: Array<{ path: string[]; values: LiteralValue[] }> = this.types.flatMap(t => t.possibleDiscriminators);

    protected typeValidator(input: unknown, options: ValidationOptions): Result<IntersectionOfTypeTuple<Types>> {
        if (!isObject(input)) {
            return this.createResult(input, undefined, { type: this, input, kind: 'invalid basic type', expected: 'object' });
        }
        const [failures, successes] = partition(
            this.types.map(type => type.validate(input, options)),
            isFailure,
        );
        const details = failures.flatMap(f => f.details);
        return this.createResult(
            input,
            !details.length && options.mode === 'construct'
                ? (Object.assign({}, ...successes.map(s => s.value)) as Record<string, unknown>)
                : input,
            details,
        );
    }
}
define(IntersectionType, 'basicType', 'object');

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(IntersectionType, 'createAutoCastAllType', function (this: IntersectionType<OneOrMore<BaseObjectLikeTypeImpl<unknown>>>) {
    const types = this.types.map(t => t.autoCastAll) as OneOrMore<BaseObjectLikeTypeImpl<unknown>>;
    return createType(new IntersectionType(types, extensionName(this, 'autoCastAll')));
});

function checkBasicTypes(types: OneOrMore<BaseObjectLikeTypeImpl<unknown>>) {
    const nonObjectTypes = types.filter(t => t.basicType !== 'object');
    if (nonObjectTypes.length) {
        throw new Error(`can only create an intersection of objects, got: ${humanList(nonObjectTypes, 'and', t => t.name)}`);
    }
}

function checkOverlap(types: OneOrMore<BaseObjectLikeTypeImpl<unknown>>) {
    const keys = new Set<string>();
    const overlap = new Set<string>();
    for (const type of types) {
        for (const key of Object.keys(type.props)) {
            if (keys.has(key)) overlap.add(key);
            keys.add(key);
        }
    }
    if (overlap.size)
        console.warn(
            `overlapping properties are currently not supported in intersections, overlapping properties: ${humanList(
                [...overlap].sort(),
                'and',
            )}`,
        );
}

/**
 * Intersect the given types.
 *
 * @param args - the optional name and all types to intersect
 */
export function intersection<Types extends OneOrMore<BaseObjectLikeTypeImpl<unknown>>>(
    ...args: [name: string, types: Types] | [types: Types]
): TypeImpl<IntersectionType<Types>> {
    const [name, types] = decodeOptionalName(args);
    return createType(new IntersectionType(types, name));
}

function defaultName(types: BaseObjectLikeTypeImpl<unknown>[]): string {
    const [combinableTypes, restTypes] = partition(
        types,
        type => !(type instanceof UnionType) && type.basicType === 'object' && type.isDefaultName,
    );
    const names = restTypes.map(({ name }) => bracketsIfNeeded(name, '&'));
    if (combinableTypes.length) {
        // We can combine interfaces with default naming (no custom name)
        names.push(combinedName(combinableTypes));
    }
    return names.join(' & ');
}

function combinedName(types: BaseObjectLikeTypeImpl<unknown>[]) {
    const collectedProps: PropertiesInfo = {};
    for (const { propsInfo } of types) {
        for (const [key, prop] of Object.entries(propsInfo ?? {})) {
            if (!collectedProps[key] || (collectedProps[key]?.partial && !prop.partial)) {
                collectedProps[key] = prop;
            }
        }
    }
    return defaultObjectRep(collectedProps);
}

export type IntersectionOfTypeTuple<Tuple extends TypeLink<unknown>[]> = IntersectionOfTypeUnion<Tuple[number]>;
export type IntersectionOfTypeUnion<Union extends TypeLink<unknown>> = (
    // v--- always matches, but will distribute a union over the the first leg of the ternary expression
    Union extends unknown
        ? // v--- map the union to functions that accept the elements of the union (we are now a union of functions)
          (k: TypeOf<Union>) => void
        : never
) extends (k: infer Intersection) => void
    ? //  ^--- Then coerce the union of functions into a single function that implements all of them, that function must accept
      //       the intersection of all elements of the union
      // v--- Then (if possible) merge all properties into a single object for clarity
      MergeIntersection<Intersection>
    : never;

export type PropertiesOfTypeTuple<Tuple extends BaseObjectLikeTypeImpl<unknown>[]> = ObjectUnionToIntersection<Tuple[number]['props']> &
    Properties;

export type ObjectUnionToIntersection<Union> = (
    // v--- always matches, but will distribute a union over the the first leg of the ternary expression
    Union extends unknown
        ? // v--- map the union to functions that accept the elements of the union (we are now a union of functions)
          (k: Union) => void
        : never
) extends (k: infer Intersection) => void
    ? //  ^--- Then coerce the union of functions into a single function that implements all of them, that function must accept
      //       the intersection of all elements of the union
      // v--- Then (if possible) merge all properties into a single object for clarity
      MergeIntersection<Intersection>
    : never;

BaseObjectLikeTypeImpl.prototype.and = function <Other extends BaseObjectLikeTypeImpl<unknown>>(other: Other) {
    return intersection([this, other]);
};
