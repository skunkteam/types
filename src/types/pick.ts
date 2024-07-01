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
import { checkOneOrMore, decodeOptionalName, define, hasOwnProperty, interfaceStringify, prependPathToDetails } from '../utils';
import { UnionType, propsInfoToProps, union } from './union';
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
        this.props = propsInfoToProps(this.propsInfo);
    }

    protected override typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        if (!unknownRecord.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'object' });
        }

        const constructResult: Record<string, unknown> = {};
        const details: MessageDetails[] = [];
        for (const [key, innerType] of this.propsArray) {
            const missingKey = !hasOwnProperty(input, key);
            const partialKey = this.propsInfo[key]?.partial;

            if (missingKey) {
                partialKey || details.push({ kind: 'missing property', property: key, type: innerType });
                continue;
            }

            const innerResult = innerType.validate(input[key], options);
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
        return union(checkOneOrMore(unionType.types.map(type => new PickType(type, keys)))) as unknown as ObjectType<
            DistributedPick<TypeOf<TypeImpl>, Keys>
        >;
    }
    return createType(new PickType(baseType, keys, name));
}

export const pickPropertiesInfo = (propsInfo: PropertiesInfo, keys: OneOrMore<keyof Properties>) =>
    Object.fromEntries(
        keys
            .map(property => [property, propsInfo[property]])
            .filter((v): v is [string, PropertiesInfo[keyof PropertiesInfo]] => v[1] !== undefined),
    );
