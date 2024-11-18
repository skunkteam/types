import { autoCastAll } from '../autocast';
import { BaseObjectLikeTypeImpl, createType, type TypedPropertyInformation } from '../base-type';
import type {
    MergeIntersection,
    OneOrMore,
    PossibleDiscriminator,
    Properties,
    PropertiesInfo,
    Result,
    Type,
    TypeImpl,
    ValidationOptions,
    Visitor,
} from '../interfaces';
import type { designType } from '../symbols';
import {
    bracketsIfNeeded,
    decodeOptionalName,
    defaultObjectRep,
    define,
    humanList,
    interfaceStringify,
    isFailure,
    partition,
    wrapperName,
} from '../utils';
import { UnionType } from './union';
import { unknownRecord } from './unknown';

/**
 * The implementation behind types created with {@link intersection} and {@link BaseObjectLikeTypeImpl.and}.
 */
export class IntersectionType<Types extends OneOrMore<BaseObjectLikeTypeImpl<unknown>>>
    extends BaseObjectLikeTypeImpl<IntersectionOfTypeTuple<Types>, undefined>
    implements TypedPropertyInformation<PropertiesOfTypeTuple<Types>>
{
    /** {@inheritdoc BaseTypeImpl.name} */
    readonly name: string;
    /** {@inheritdoc BaseTypeImpl.basicType} */
    readonly basicType!: 'object';
    /** {@inheritdoc BaseObjectLikeTypeImpl.isDefaultName} */
    readonly isDefaultName: boolean;
    /** {@inheritdoc BaseTypeImpl.typeConfig} */
    readonly typeConfig: undefined;

    constructor(readonly types: Types, name?: string) {
        super();
        this.isDefaultName = !name;
        this.name = name || defaultName(types);
        checkOverlap(types);
    }

    // TODO: Support overlapping properties
    /** {@inheritdoc BaseObjectLikeTypeImpl.props} */
    readonly props = Object.assign({}, ...this.types.map(type => type.props)) as PropertiesOfTypeTuple<Types>;
    /** {@inheritdoc BaseObjectLikeTypeImpl.propsInfo} */
    readonly propsInfo = Object.assign({}, ...this.types.map(type => type.propsInfo)) as PropertiesInfo<PropertiesOfTypeTuple<Types>>;
    readonly combinedName = combinedName(this.types);
    /** {@inheritdoc BaseObjectLikeTypeImpl.possibleDiscriminators} */
    readonly possibleDiscriminators: readonly PossibleDiscriminator[] = this.types
        .flatMap(t => t.possibleDiscriminators)
        .map(({ path, values }) => ({ path, values }));

    /** {@inheritdoc BaseTypeImpl.typeValidator} */
    protected typeValidator(input: unknown, options: ValidationOptions): Result<IntersectionOfTypeTuple<Types>> {
        if (!unknownRecord.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'object' });
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

    /** {@inheritdoc BaseTypeImpl.accept} */
    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitObjectLikeType(this);
    }

    /** {@inheritdoc BaseTypeImpl.maybeStringify} */
    override maybeStringify(value: IntersectionOfTypeTuple<Types>): string {
        return interfaceStringify(this.propsArray, value as Record<string, unknown>);
    }
}
define(IntersectionType, 'basicType', 'object');

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(IntersectionType, 'createAutoCastAllType', function (this: IntersectionType<OneOrMore<BaseObjectLikeTypeImpl<unknown>>>) {
    const types = this.types.map(autoCastAll) as OneOrMore<BaseObjectLikeTypeImpl<unknown>>;
    return createType(new IntersectionType(types, wrapperName(this, 'AutoCastAll')));
});

function checkOverlap(types: OneOrMore<BaseObjectLikeTypeImpl<unknown>>) {
    const keys = new Map<string, Type<any>>();
    const overlap = new Set<string>();
    for (const type of types) {
        for (const [key, propType] of Object.entries(type.props)) {
            const prevPropType = keys.get(key);
            if (!prevPropType) {
                keys.set(key, propType);
            } else if (prevPropType !== propType) {
                overlap.add(key);
            }
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

function defaultName(types: readonly BaseObjectLikeTypeImpl<unknown>[]): string {
    const [combinableTypes, restTypes] = partition(
        types.slice(),
        type => !(type instanceof UnionType) && type.basicType === 'object' && type.isDefaultName,
    );
    const names = restTypes.map(({ name }) => bracketsIfNeeded(name, '&'));
    if (combinableTypes.length) {
        // We can combine interfaces with default naming (no custom name)
        names.push(combinedName(combinableTypes));
    }
    return names.join(' & ');
}

function combinedName(types: readonly BaseObjectLikeTypeImpl<unknown>[]) {
    const collectedProps: PropertiesInfo = {};
    for (const { propsInfo } of types) {
        for (const [key, prop] of Object.entries(propsInfo)) {
            if (!collectedProps[key] || (collectedProps[key]?.optional && !prop.optional)) {
                collectedProps[key] = prop;
            }
        }
    }
    return defaultObjectRep(collectedProps);
}

export type IntersectionOfTypeTuple<Tuple> = Tuple extends [{ readonly [designType]: infer A }]
    ? MergeIntersection<A>
    : Tuple extends [{ readonly [designType]: infer A }, ...infer Rest]
    ? MergeIntersection<A & IntersectionOfTypeTuple<Rest>>
    : Record<string, unknown>;

export type PropertiesOfTypeTuple<Tuple> = Tuple extends [{ readonly props: infer A }]
    ? MergeIntersection<A>
    : Tuple extends [{ readonly props: infer A }, ...infer Rest]
    ? MergeIntersection<A & PropertiesOfTypeTuple<Rest>>
    : Properties;

BaseObjectLikeTypeImpl.prototype.and = function <Other extends BaseObjectLikeTypeImpl<any, any>>(other: Other) {
    return intersection([this, other]);
};
