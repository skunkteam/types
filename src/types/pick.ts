import { BaseObjectLikeTypeImpl, createType } from '../base-type';
import type {
    BasicType,
    MessageDetails,
    ObjectType,
    OneOrMore,
    PossibleDiscriminator,
    Properties,
    PropertiesInfo,
    Result,
    TypeOf,
    ValidationOptions,
    Visitor,
} from '../interfaces';
import { checkOneOrMore, decodeOptionalName, define, hasOwnProperty, interfaceStringify, mapValues, prependPathToDetails } from '../utils';
import { UnionType, union } from './union';
import { unknownRecord } from './unknown';

type PickableImpl = BaseObjectLikeTypeImpl<unknown>;
type PickableKeys<Type> = Type extends unknown ? keyof Type & string : never;
type DistributedPick<Type, Keys extends PickableKeys<Type>> = Type extends unknown ? Pick<Type, Keys & keyof Type> : never;

export class PickType<Type extends PickableImpl, ResultType> extends BaseObjectLikeTypeImpl<ResultType> {
    readonly name: string;
    readonly isDefaultName: boolean;
    readonly props: Properties;
    override propsInfo: PropertiesInfo = pickPropertiesInfo(this.type.propsInfo, this.keys);
    override basicType!: BasicType;
    override typeConfig: unknown;
    override possibleDiscriminators: readonly PossibleDiscriminator[] = this.type.possibleDiscriminators.filter(disc =>
        (this.keys as (string | undefined)[]).includes(disc.path[0]),
    );

    constructor(
        readonly type: Type,
        readonly keys: OneOrMore<PickableKeys<TypeOf<Type>>>,
        name?: string,
    ) {
        super();
        this.isDefaultName = !name;
        this.name = name || `Pick<${type.name}, ${keys.map(k => `'${k}'`).join(' | ')}>`;
        this.props = mapValues(this.propsInfo, i => i.type);
    }

    protected override typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        if (!unknownRecord.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'object' });
        }

        const constructResult: Record<string, unknown> = {};
        const details: MessageDetails[] = [];
        for (const [key, { type, optional }] of this.propsArray) {
            const missingKey = !hasOwnProperty(input, key);

            if (missingKey) {
                optional || details.push({ kind: 'missing property', property: key, type });
                continue;
            }

            const innerResult = type.validate(input[key], options);
            if (innerResult.ok) {
                constructResult[key] = innerResult.value;
            } else {
                details.push(...prependPathToDetails(innerResult, key));
            }
        }
        return this.createResult(input, options.mode === 'construct' ? constructResult : input, details);
    }
    override accept<R>(visitor: Visitor<R>): R {
        return visitor.visitObjectLikeType(this);
    }
    /** {@inheritdoc BaseTypeImpl.maybeStringify} */
    override maybeStringify(value: ResultType): string {
        return interfaceStringify(this.propsArray, value as Record<string, unknown>);
    }
}
define(PickType, 'basicType', 'object');

export function pick<TypeImpl extends PickableImpl, Keys extends PickableKeys<TypeOf<TypeImpl>>>(
    ...args: [name: string, baseType: TypeImpl, keys: OneOrMore<Keys>] | [baseType: TypeImpl, keys: OneOrMore<Keys>]
): ObjectType<DistributedPick<TypeOf<TypeImpl>, Keys>> {
    const [name, baseType, keys] = decodeOptionalName(args);
    if (baseType instanceof UnionType) {
        const unionType: UnionType<OneOrMore<BaseObjectLikeTypeImpl<TypeOf<TypeImpl>>>, TypeOf<TypeImpl>> = baseType;
        if (!(unionType.basicType === 'object')) {
            throw new Error(`Can only pick elements of unions with 'object' as basic type.`);
        }
        const narrowedKeys = narrowPickedKeys(keys, unionType.types);
        if (!validPick(keys, narrowedKeys)) {
            throw new Error('Selected keys describe impossible union variant.');
        }

        const innerTypes = unionType.types
            .map((innerType, idx) => {
                const specificKeys = narrowedKeys[idx] ?? [];
                const keyCount = specificKeys.length;
                // Only build the pick union elements if at least one of their keys has been picked.
                // Also temporarily store the key count in a tuple to sort.
                return [keyCount, keyCount ? new PickType(innerType, checkOneOrMore(specificKeys)) : undefined] as const;
            })
            // Sorting is necessary so the union type will internally match with a maximum subtype. This is so that types don't accidentally
            // get narrowed too much during parsing and stringifying.
            .sort(([aKeys, _1], [bKeys, _2]) => bKeys - aKeys) // Reverse sort: from most keys to least keys.
            .flatMap(([_, innerType]) => innerType ?? []);

        return union(
            // Manually rename the type, because it's confusing if your union elements are suddenly in a different order.
            name ?? `Pick<${baseType.name}, ${keys.map(key => `'${key}'`).join(' | ')}>`,
            checkOneOrMore(innerTypes),
        ) as unknown as ObjectType<DistributedPick<TypeOf<TypeImpl>, Keys>>;
    }

    return createType(new PickType(baseType, keys, name));
}

export const pickPropertiesInfo = (propsInfo: PropertiesInfo, keys: OneOrMore<keyof Properties>) =>
    Object.fromEntries(
        keys
            .map(property => [property, propsInfo[property]])
            .filter((v): v is [string, PropertiesInfo[keyof PropertiesInfo]] => v[1] !== undefined),
    );

/** Return the intersection of picked keys with each of the property keys of the inner types. */
export const narrowPickedKeys = <TypeImpl extends PickableImpl, Keys extends PickableKeys<TypeOf<TypeImpl>>>(
    pickedKeys: OneOrMore<Keys>,
    innerTypes: OneOrMore<TypeImpl>,
): OneOrMore<Keys[]> =>
    innerTypes
        .map(type => Object.keys(type.props))
        .map(innerKeys => pickedKeys.filter(pickedKey => innerKeys.find(innerKey => pickedKey === innerKey))) as OneOrMore<Keys[]>;

/**
 * Check if the intersection of all the non-empty narrowed keys is not empty. If it is, it means the picked keys describe an impossible
 * union variant. Empty narrowed keys are ignored, because they will not end up in the union at all.
 */
export const validPick = (pickedKeys: string[], innerTypeKeys: OneOrMore<string[]>): boolean =>
    innerTypeKeys.reduce((intersect, keys) => intersect.filter(k1 => (keys.length ? keys.find(k2 => k1 === k2) : true)), pickedKeys)
        .length > 0;
