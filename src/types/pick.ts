import { BaseObjectLikeTypeImpl, createType } from '../base-type.js';
import type {
    BasicType,
    MessageDetails,
    OneOrMore,
    PossibleDiscriminator,
    Properties,
    PropertiesInfo,
    Result,
    Type,
    TypeImpl,
    TypeOf,
    ValidationOptions,
    Visitor,
} from '../interfaces.js';
import { decodeOptionalName } from '../utils/collection-utils.js';
import { define } from '../utils/define.js';
import { unknownRecord } from './unknown.js';
import { hasOwnProperty } from '../utils/type-utils.js';
import { prependPathToDetails } from '../utils/failure-utils.js';
import { interfaceStringify } from '../utils/stringifiers.js';

export class PickType<Type extends BaseObjectLikeTypeImpl<unknown>, ResultType> extends BaseObjectLikeTypeImpl<ResultType> {
    /** {@inheritdoc BaseTypeImpl.name} */
    readonly name: string;
    /** {@inheritdoc BaseObjectLikeTypeImpl.isDefaultName} */
    readonly isDefaultName: boolean;

    constructor(
        readonly type: Type,
        readonly keys: OneOrMore<keyof TypeOf<Type>>,
        name?: string,
    ) {
        super();
        this.isDefaultName = !name;
        this.name = name || `Pick<${type.name}, ${keys.map(k => `'${k.toString()}'`).join(' | ')}>`;
    }

    readonly props: Properties = pickProperties(this.type.props, this.keys.map(k => k.toString()) as [string, ...string[]]);
    override propsInfo: PropertiesInfo = pickPropertiesInfo(this.type.propsInfo, this.keys.map(k => k.toString()) as [string, ...string[]]);
    override possibleDiscriminators: readonly PossibleDiscriminator[] = this.type.possibleDiscriminators; // TODO: Filter
    override basicType!: BasicType;
    override typeConfig: unknown;

    protected override typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        if (!unknownRecord.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'object' });
        }
        const constructResult: Record<string, unknown> = {};
        const details: MessageDetails[] = [];
        for (const [key, innerType] of this.propsArray) {
            const missingKey = !hasOwnProperty(input, key);
            const partialKey = this.propsInfo[key]?.partial;
            if (missingKey && partialKey) {
                details.push({ kind: 'missing property', property: key, type: innerType });
                continue;
            }
            const innerResult = innerType.validate(input[key], options);
            if (innerResult.ok) {
                constructResult[key] = innerResult.value;
            } else if (missingKey) {
                details.push({ kind: 'missing property', property: key, type: innerType });
            } else {
                details.push(...prependPathToDetails(innerResult, key));
            }
        }
        return this.createResult(input, options.mode === 'construct' ? constructResult : input, details);
    }
    override accept<R>(visitor: Visitor<R>): R {
        // TODO: Should be fine, right?
        return visitor.visitObjectLikeType(this);
    }
    /** {@inheritdoc BaseTypeImpl.maybeStringify} */
    override maybeStringify(value: ResultType): string {
        return interfaceStringify(this.propsArray, value as Record<string, unknown>);
    }
}
define(PickType, 'basicType', 'object');

export function pick<Type extends BaseObjectLikeTypeImpl<unknown>, Keys extends OneOrMore<keyof TypeOf<Type>>>(
    ...args: [name: string, baseType: Type, keys: Keys] | [baseType: Type, keys: Keys]
): TypeImpl<PickType<Type, Pick<TypeOf<Type>, Keys[number]>>> {
    const [name, baseType, keys] = decodeOptionalName(args);
    return createType(new PickType(baseType, keys, name));
}

export function pickProperties(props: Properties, keys: OneOrMore<keyof Properties>) {
    const properties = keys
        .map(property => [property, props[property]] as const)
        .filter<[string, Type<any>]>((v): v is [string, Type<any>] => v[1] !== undefined);
    return Object.fromEntries(properties);
}

export function pickPropertiesInfo(propsInfo: PropertiesInfo, keys: OneOrMore<keyof Properties>) {
    const properties = keys
        .map(property => [property, propsInfo[property]] as const)
        .filter<[string, PropertiesInfo[keyof PropertiesInfo]]>(
            (v): v is [string, PropertiesInfo[keyof PropertiesInfo]] => v[1] !== undefined,
        );
    return Object.fromEntries(properties);
}
