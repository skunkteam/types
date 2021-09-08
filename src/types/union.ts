import { BaseObjectLikeTypeImpl, BaseTypeImpl, createType } from '../base-type';
import type {
    BasicType,
    LiteralValue,
    OneOrMore,
    Properties,
    PropertiesInfo,
    Result,
    TypeImpl,
    TypeOf,
    ValidationOptions,
} from '../interfaces';
import { bracketsIfNeeded, decodeOptionalName, define, extensionName, printPath } from '../utils';

/**
 * The implementation behind types created with {@link union} and {@link BaseTypeImpl.or}.
 */
export class UnionType<
    Types extends OneOrMore<BaseTypeImpl<unknown>>,
    ResultType extends TypeOf<Types[number]> = TypeOf<Types[number]>,
> extends BaseObjectLikeTypeImpl<ResultType> {
    readonly name: string;
    readonly isDefaultName: boolean;
    readonly basicType = analyzeBasicType(this.types);
    readonly typeConfig: undefined;

    constructor(readonly types: Types, name?: string) {
        super();
        this.isDefaultName = !name;
        this.name = name || types.map(type => bracketsIfNeeded(type.name, '|')).join(' | ');
    }

    readonly propsInfo = analyzePropsInfo(this.types);
    readonly props = propsInfoToProps(this.propsInfo);
    readonly possibleDiscriminators = analyzePossibleDiscriminators(this.types);
    readonly collapsedTypes = this.types.flatMap(type => (type instanceof UnionType ? (type.types as Types) : type)) as Types;
    override readonly enumerableLiteralDomain = analyzeEnumerableLiteralDomain(this.types);

    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        const failures = [];
        for (const type of this.collapsedTypes) {
            const result = type.validate(input, options);
            if (result.ok) {
                return this.createResult(input, result.value, true);
            }
            failures.push(result);
        }
        return this.createResult(input, undefined, { kind: 'union', failures });
    }
}

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(UnionType, 'createAutoCastAllType', function (this: UnionType<OneOrMore<BaseTypeImpl<unknown>>, any>) {
    const types = this.types.map(t => t.autoCastAll) as OneOrMore<BaseTypeImpl<unknown>>;
    return createType(new UnionType(types, extensionName(this, 'autoCastAll')));
});

export function union<Types extends OneOrMore<BaseTypeImpl<unknown>>>(
    ...args: [name: string, types: Types] | [types: Types]
): TypeImpl<UnionType<Types>> {
    const [name, types] = decodeOptionalName(args);
    return createType(new UnionType(types, name));
}

function analyzeBasicType(types: OneOrMore<BaseTypeImpl<unknown>>): BasicType | 'mixed' {
    const [first] = types;
    return types.every(t => t.basicType === first.basicType) ? first.basicType : 'mixed';
}

function analyzePropsInfo<Types extends OneOrMore<BaseTypeImpl<unknown> | BaseObjectLikeTypeImpl<unknown>>>(types: Types): PropertiesInfo {
    const [first, ...rest] = types;
    const result: PropertiesInfo = { ...('propsInfo' in first && first.propsInfo) };
    for (const nextType of rest) {
        if ('propsInfo' in nextType) {
            for (const [missingKey, propInfo] of Object.entries(result).filter(([key]) => !(key in nextType.propsInfo))) {
                propInfo.partial || (result[missingKey] = { ...propInfo, partial: true });
            }
            for (const [key, { type }] of Object.entries(nextType.propsInfo)) {
                const existing = result[key];
                result[key] = { partial: existing?.partial ?? true, type: existing?.type.or(type) ?? type };
            }
        } else {
            return {};
        }
    }
    return result;
}

function analyzePossibleDiscriminators(types: Array<BaseTypeImpl<unknown> | BaseObjectLikeTypeImpl<unknown>>) {
    let found: Record<string, { path: string[]; values: LiteralValue[] }> | undefined;
    // Generate the intersection (based on path) of all 'possibleDiscriminators' in all object like types in `types`
    for (const type of types) {
        // All object-types have 'possibleDiscriminators' (even if it is empty)
        if ('possibleDiscriminators' in type) {
            const pds: typeof found = {};
            for (const d of type.possibleDiscriminators) {
                pds[printPath(d.path)] = d;
            }
            if (!found) {
                found = pds;
            } else {
                for (const [path, thisOne] of Object.entries(found)) {
                    const otherOne = pds[path];
                    if (otherOne) {
                        found[path] = { path: thisOne.path, values: [...new Set([...thisOne.values, ...otherOne.values])] };
                    } else {
                        delete found[path];
                    }
                }
            }
        }
    }
    return found ? Object.values(found) : [];
}
function propsInfoToProps(propsInfo: PropertiesInfo): Properties {
    const result: Properties = {};
    for (const [key, { type }] of Object.entries(propsInfo)) {
        result[key] = type;
    }
    return result;
}

function analyzeEnumerableLiteralDomain(types: BaseTypeImpl<unknown>[]): Set<LiteralValue> | undefined {
    return types.every(hasEnumerableLiteralDomain) ? new Set(types.flatMap(t => [...t.enumerableLiteralDomain])) : undefined;
}

function hasEnumerableLiteralDomain<T extends BaseTypeImpl<unknown>>(type: T): type is T & { enumerableLiteralDomain: Set<LiteralValue> } {
    return !!type.enumerableLiteralDomain;
}

BaseTypeImpl.prototype.or = function <Other extends BaseTypeImpl<unknown>>(other: Other) {
    return union([this, other]);
};
