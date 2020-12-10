import { BaseObjectLikeTypeImpl, BaseTypeImpl, createType } from '../base-type';
import type {
    FailureDetails,
    LiteralValue,
    Properties,
    PropertiesInfo,
    Result,
    Type,
    TypeImpl,
    TypeOfProperties,
    ValidationOptions,
    Writable,
} from '../interfaces';
import { decodeOptionalName, defaultObjectRep, hasOwnProperty, isObject, prependPathToDetails } from '../utils';
import { intersection, IntersectionType } from './intersection';
import { LiteralType } from './literal';

export interface InterfaceTypeOptions {
    name?: string;
    partial?: boolean;
    /** Discriminate between missing keys and undefined values. Is off by default because that is what TypeScript does. */
    strictMissingKeys?: boolean;
    // /** When constructing values, allow unknown properties to pass unvalidated into the constructed value. */
    // TODO: allowUnknownProperties?: boolean; // default: false
}

export class InterfaceType<Props extends Properties, ResultType> extends BaseObjectLikeTypeImpl<ResultType> {
    readonly name: string;
    readonly basicType = 'object';
    readonly isDefaultName: boolean;

    constructor(readonly props: Props, readonly options: InterfaceTypeOptions) {
        super();
        this.isDefaultName = !options.name;
        this.name = options.name || defaultObjectRep(this.propsInfo);
    }

    readonly keys = Object.keys(this.props) as Array<keyof Props>;
    readonly propsInfo = toPropsInfo(this.props, this.options.partial);
    readonly possibleDiscriminators = this.options.partial ? [] : getPossibleDiscriminators(this.props);

    typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        const { strictMissingKeys, partial } = this.options;
        const baseFailure = { type: this, value: input } as const;
        if (!isObject(input)) {
            return this.createResult(input, { ...baseFailure, kind: 'invalid basic type', expected: 'object' });
        }
        const constructResult = {} as Record<string, unknown>;
        const details: FailureDetails[] = [];
        for (const [key, innerType] of Object.entries(this.props)) {
            const missingKey = !hasOwnProperty(input, key);
            if (partial) {
                if (missingKey || (!strictMissingKeys && input[key] === undefined)) continue;
            } else if (missingKey && strictMissingKeys) {
                details.push(this.missingProperty(input, key, innerType));
                continue;
            }
            const innerResult = innerType.validate(input[key], options);
            if (innerResult.ok) {
                constructResult[key] = innerResult.value;
            } else if (missingKey) {
                details.push(this.missingProperty(input, key, innerType));
            } else {
                details.push(...prependPathToDetails(innerResult, key));
            }
        }
        return this.createResult(!details.length && options.mode === 'construct' ? constructResult : input, details);
    }

    toPartial(name = `Partial<${this.name}>`): PartialType<Props> {
        return createType(new InterfaceType(this.props, { ...this.options, partial: true, name }));
    }

    withOptional<PartialProps extends Properties>(
        ...args: [props: PartialProps] | [name: string, props: PartialProps]
    ): TypeImpl<IntersectionType<[this, PartialType<PartialProps>]>> {
        const [name = this.isDefaultName ? undefined : this.name, props] = decodeOptionalName<[PartialProps]>(args);
        return name ? intersection(name, [this, partial(props)]) : intersection([this, partial(props)]);
    }

    private missingProperty(value: unknown, property: string, type: BaseTypeImpl<unknown>): FailureDetails {
        return { kind: 'missing property', value, property, type };
    }
}

type FullType<Props extends Properties> = TypeImpl<InterfaceType<Props, TypeOfProperties<Writable<Props>>>>;

export function type<Props extends Properties>(
    ...args: [props: Props] | [name: string, props: Props] | [options: InterfaceTypeOptions, props: Props]
): FullType<Props> {
    const [options, props] = getOptions(args);
    return createType(new InterfaceType(props, options));
}

type PartialType<Props extends Properties> = TypeImpl<InterfaceType<Props, Partial<TypeOfProperties<Writable<Props>>>>>;

export function partial<Props extends Properties>(...args: [props: Props] | [name: string, props: Props]): PartialType<Props> {
    const [options, props] = getOptions(args);
    return createType(new InterfaceType(props, { ...options, partial: true }));
}

function getOptions<Props extends Properties>(
    args: [props: Props] | [name: string, props: Props] | [options: InterfaceTypeOptions, props: Props],
): [InterfaceTypeOptions, Props] {
    if (args.length === 1) {
        return [{}, args[0]];
    }
    const [options, props] = args;
    return typeof options === 'string' ? [{ name: options }, props] : [options, props];
}

function toPropsInfo<Props extends Properties>(props: Props, partial = false): PropertiesInfo<Props> {
    const result = {} as PropertiesInfo;
    for (const [key, type] of Object.entries(props)) {
        result[key] = { partial, type };
    }
    return result as PropertiesInfo<Props>;
}

function getPossibleDiscriminators(props: Record<string, Type<unknown> | BaseObjectLikeTypeImpl<unknown> | LiteralType<LiteralValue>>) {
    const result: BaseObjectLikeTypeImpl<unknown>['possibleDiscriminators'] = [];
    for (const [key, prop] of Object.entries(props)) {
        if ('possibleDiscriminators' in prop) {
            result.push(...prop.possibleDiscriminators.map(({ path, values }) => ({ path: [key, ...path], values })));
        } else if (prop instanceof LiteralType) {
            result.push({ path: [key], values: [prop.value] });
        }
    }
    return result;
}
