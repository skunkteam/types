import { BaseObjectLikeTypeImpl, BaseTypeImpl, createType, type TypedPropertyInformation } from '../base-type';
import type {
    MessageDetails,
    ObjectType,
    PossibleDiscriminator,
    Properties,
    PropertiesInfo,
    PropertyInfo,
    Result,
    Simplify,
    Type,
    TypeImpl,
    TypeOfProperties,
    ValidationOptions,
    Validator,
    Visitor,
    Writable,
} from '../interfaces';
import {
    decodeOptionalOptions,
    defaultObjectRep,
    define,
    extensionName,
    hasOwnProperty,
    humanList,
    interfaceStringify,
    mapValues,
    plural,
    prependPathToDetails,
    printKey,
} from '../utils';
import { unknownRecord } from './unknown';

/**
 * Options for {@link object}.
 */
export interface InterfaceTypeOptions {
    /** The optional name for the type, uses a default TypeScript-like name if no name is given. */
    name?: string;
    /** Discriminate between missing keys and undefined values. Is off by default because that is what TypeScript does. */
    strictMissingKeys?: boolean;
    /**
     * Force this type (including all nested property-types recursively) to be validated in 'check' mode.
     *
     * @remarks
     * The result of the validation (when successful) will be the original input.
     *
     * Note: Any autoCast or parser on nested types will have no effect in 'check' mode.
     */
    checkOnly?: boolean;
    // /** When constructing values, allow unknown properties to pass unvalidated into the constructed value. */
    // TODO: allowUnknownProperties?: boolean; // default: false
}

export interface InterfaceTypeOptionsWithPartial extends InterfaceTypeOptions {
    /** Mark all properties as optional in this type. */
    partial?: boolean;
}

export interface InterfaceMergeOptions {
    /** The optional name for the type, uses a default TypeScript-like name if no name is given. */
    name?: string;

    /**
     * When set, do not apply the custom validations from the base types onto the new merged type.
     *
     * @remarks
     * By default, custom validations (i.e. validations that are added to a type using {@link BaseTypeImpl.withValidation | withValidation}
     * or {@link BaseTypeImpl.withConstraint | withConstraint}) are reused when merging multiple interface types using
     * {@link InterfaceType.withOptional | withOptional}, {@link InterfaceType.withRequired | withRequired} and
     * {@link InterfaceType.mergeWith | mergeWith}. Use this option to omit all custom validations in the resulting merged type.
     *
     * Note that reuse of custom validations only works when no properties overlap between the types that are being merged. As long as the
     * properties don't overlap we can be sure that the merged type is assignable to each of the original types (`A & B` is assignable to
     * both `A` and `B`). Therefore, the validations are still safe to run, even though the type has been extended with additional
     * properties.
     *
     * When overlap is detected in the property-names of the types and any custom validation is encountered by Skunk Team types, an Error
     * will be thrown. Use this option to ignore the custom validations and continue with the merge.
     */
    omitValidations?: true;

    /**
     * Suppress the error about existing custom parsers on one of the types that is being merged.
     *
     * @remarks
     * Parsers are not reused when merging multiple interface types using {@link InterfaceType.withOptional | withOptional},
     * {@link InterfaceType.withRequired | withRequired} and {@link InterfaceType.mergeWith | mergeWith}. When a custom parser is
     * encountered by Skunk Team types, an Error will be thrown. Use this option to ignore the parsers and continue with the merge.
     *
     * This is to ensure that custom parser are never accidentally lost by adding additional properties to an existing type.
     */
    omitParsers?: true;
}

export type FullType<Props extends Properties> = TypeImpl<InterfaceType<Simplify<Props>, Simplify<TypeOfProperties<Writable<Props>>>>>;

export type PartialType<Props extends Properties> = TypeImpl<
    InterfaceType<Simplify<Props>, Simplify<Partial<TypeOfProperties<Writable<Props>>>>>
>;

export type MergeType<Props extends Properties, ResultType, OtherProps extends Properties, OtherResultType> = TypeImpl<
    InterfaceType<Simplify<Omit<Props, keyof OtherProps> & OtherProps>, Simplify<Omit<ResultType, keyof OtherResultType> & OtherResultType>>
>;

/**
 * The implementation behind types created with {@link object} and {@link partial}.
 */
export class InterfaceType<Props extends Properties, ResultType>
    extends BaseObjectLikeTypeImpl<ResultType>
    implements TypedPropertyInformation<Props>
{
    /** {@inheritdoc BaseTypeImpl.name} */
    readonly name: string;
    /** {@inheritdoc BaseTypeImpl.basicType} */
    readonly basicType!: 'object';
    /** {@inheritdoc BaseObjectLikeTypeImpl.isDefaultName} */
    readonly isDefaultName: boolean;
    /** {@inheritdoc BaseTypeImpl.typeConfig} */
    readonly typeConfig: undefined;

    constructor(
        /** {@inheritdoc BaseObjectLikeTypeImpl.propsInfo} */
        readonly propsInfo: PropertiesInfo<Props>,
        readonly options: InterfaceTypeOptions,
    ) {
        super();
        this.isDefaultName = !options.name;
        this.name = options.name || defaultObjectRep(this.propsInfo);
    }

    /** The keys (property-names) for this object-like type. */
    readonly keys = Object.keys(this.propsInfo) as ReadonlyArray<keyof Props>;
    /** {@inheritdoc BaseObjectLikeTypeImpl.props} */
    readonly props = mapValues(this.propsInfo, i => i.type) as Props;
    /** {@inheritdoc BaseObjectLikeTypeImpl.possibleDiscriminators} */
    readonly possibleDiscriminators: readonly PossibleDiscriminator[] = this.propsArray.flatMap(getPossibleDiscriminators);

    /** {@inheritdoc BaseTypeImpl.typeValidator} */
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType> {
        if (this.options.checkOnly) {
            // can copy here, because this is done after adding the 'visitedMap'
            options = { ...options, mode: 'check' };
        }
        if (!unknownRecord.is(input)) {
            return this.createResult(input, undefined, { kind: 'invalid basic type', expected: 'object' });
        }
        const { strictMissingKeys } = this.options;
        const constructResult: Record<string, unknown> = {};
        const details: MessageDetails[] = [];
        for (const [key, { type: innerType, optional: partial }] of this.propsArray) {
            const missingKey = !hasOwnProperty(input, key);
            if (partial) {
                if (missingKey || (!strictMissingKeys && input[key] === undefined)) {
                    continue;
                }
            } else if (missingKey && strictMissingKeys) {
                details.push(missingProperty(key, innerType));
                continue;
            }
            const innerResult = innerType.validate(input[key], options);
            if (innerResult.ok) {
                constructResult[key] = innerResult.value;
            } else if (missingKey) {
                details.push(missingProperty(key, innerType));
            } else {
                details.push(...prependPathToDetails(innerResult, key));
            }
        }
        return this.createResult(input, options.mode === 'construct' ? constructResult : input, details);
    }

    /** Clone this type with all properties marked optional. */
    toPartial(name = `Partial<${this.name}>`): PartialType<Props> {
        return createType(new InterfaceType(toPropsInfo(this.props, true), { ...this.options, name }));
    }

    /**
     * Create a type with all properties of the current type, plus the given optional properties.
     *
     * @remarks
     * Note that any property that conflicts with an existing property is overwritten, so this can also be used to selectively mark
     * certain properties as optional or change their type.
     *
     * Any options such as `strictMissingKeys` and custom names (unless provided in this call) will be inherited by this new type, but
     * custom parsers and validators are dropped.
     */
    withOptional<PartialProps extends Properties>(
        ...args: [props: PartialProps] | [name: string, props: PartialProps] | [options: InterfaceMergeOptions, props: PartialProps]
    ): MergeType<Props, ResultType, PartialProps, Partial<TypeOfProperties<Writable<PartialProps>>>> {
        const [opts, props] = decodeOptionalOptions<InterfaceMergeOptions, PartialProps>(args);
        return this._mergeWith(opts, toPropsInfo(props, true), [], false, 'withOptional');
    }

    /**
     * Create a type with all properties of the current type, plus the given additional required properties.
     *
     * @remarks
     * Note that any property that conflicts with an existing property is overwritten, so this can also be used to selectively mark
     * certain properties as required or change their type.
     *
     * Any options such as `strictMissingKeys` and custom names (unless provided in this call) will be inherited by this new type, but
     * custom parsers and validators are dropped.
     */
    withRequired<OtherProps extends Properties>(
        ...args: [props: OtherProps] | [name: string, props: OtherProps] | [options: InterfaceMergeOptions, props: OtherProps]
    ): MergeType<Props, ResultType, OtherProps, TypeOfProperties<Writable<OtherProps>>> {
        const [opts, props] = decodeOptionalOptions<InterfaceMergeOptions, OtherProps>(args);
        return this._mergeWith(opts, toPropsInfo(props, false), [], false, 'withRequired');
    }

    /**
     * Create a new type by merging all properties of the given type into the properties of this type.
     *
     * @remarks
     * Keys of the given (right hand side) type override keys of this type (left hand side). Any options such as `strictMissingKeys` and
     * custom names are inherited from the left hand side type, but custom parsers and validators are dropped.
     */
    mergeWith<OtherProps extends Properties, OtherType>(
        ...args:
            | [type: InterfaceType<OtherProps, OtherType>]
            | [name: string, type: InterfaceType<OtherProps, OtherType>]
            | [options: InterfaceMergeOptions, type: InterfaceType<OtherProps, OtherType>]
    ): MergeType<Props, ResultType, OtherProps, OtherType> {
        const [opts, other] = decodeOptionalOptions<InterfaceMergeOptions, InterfaceType<OtherProps, OtherType>>(args);
        return this._mergeWith(opts, other.propsInfo, other.customValidators, !!other.typeParser, 'mergeWith');
    }

    private _mergeWith<OtherProps extends Properties, OtherType>(
        { name = this.isDefaultName ? undefined : this.name, omitParsers, omitValidations }: Partial<InterfaceMergeOptions>,
        otherPropsInfo: PropertiesInfo<OtherProps>,
        otherCustomValidators: ReadonlyArray<Validator<unknown>>,
        otherHasCustomParser: boolean,
        method: string,
    ): MergeType<Props, ResultType, OtherProps, OtherType> {
        const customValidators = omitValidations ? [] : [...this.customValidators, ...otherCustomValidators];
        if (customValidators.length) {
            // Check that we have no conflicting properties. If there are no conflicting properties then each validator is still safe to
            // run, each type in a TypeScript intersection is assignable to each of the elements in the intersection.
            const conflictingProperties = Object.keys(otherPropsInfo).filter(key => key in this.propsInfo);
            if (conflictingProperties.length) {
                const conflicts = humanList(conflictingProperties, 'and', key => `<${printKey(key)}>`);
                const propertiesAre = plural(conflictingProperties, 'property is', 'properties are');
                throw new Error(
                    `Error in ${this.name}.${method}(): Merge operation not allowed because one of the types has custom ` +
                        `validations applied and the following ${propertiesAre} defined on both sides: ${conflicts}, ` +
                        'use `omitValidations` to prevent this error or remove the conflicting property.',
                );
            }
        }
        if (!omitParsers && (this.typeParser || otherHasCustomParser)) {
            throw new Error(
                `Error in ${this.name}.${method}(): Merge operation not allowed because one of the types has custom ` +
                    'parsers applied, use `omitParsers` to suppress this error.',
            );
        }
        const propsInfo: PropertiesInfo<Omit<Props, keyof OtherProps>> & PropertiesInfo<OtherProps> = {
            ...this.propsInfo,
            ...otherPropsInfo,
        };
        return createType(
            new InterfaceType(propsInfo as PropertiesInfo<Omit<Props, keyof OtherProps> & OtherProps>, { ...this.options, name }),
            { customValidators: { configurable: true, value: customValidators } },
        );
    }

    /** {@inheritdoc BaseTypeImpl.accept} */
    accept<R>(visitor: Visitor<R>): R {
        return visitor.visitObjectLikeType(this);
    }

    /** {@inheritdoc BaseTypeImpl.maybeStringify} */
    override maybeStringify(value: ResultType): string {
        return interfaceStringify(this.propsArray, value as Record<string, unknown>);
    }
}
define(InterfaceType, 'basicType', 'object');

// Defined outside class definition, because TypeScript somehow ends up in a wild-typings-goose-chase that takes
// up to a minute or more. We have to make sure consuming libs don't have to pay this penalty ever.
define(InterfaceType, 'createAutoCastAllType', function (this: InterfaceType<Properties, any>) {
    const name = extensionName(this, 'autoCastAll');
    const props: PropertiesInfo = {};
    for (const [key, { type, optional: partial }] of this.propsArray) {
        props[key] = { type: type.autoCastAll, optional: partial };
    }
    return createType(new InterfaceType(props, { ...this.options, name }).autoCast);
});

function missingProperty(property: string, type: BaseTypeImpl<unknown>): MessageDetails {
    return { kind: 'missing property', property, type };
}

/**
 * Create a type-validator that validates (or parses) an object structure.
 *
 * @remarks
 * This is a basic building block for more complex structured types, can be nested.
 *
 * @param args - the options and properties of the new type
 */
export function object<Props extends Properties>(
    ...args: [props: Props] | [name: string, props: Props] | [options: InterfaceTypeOptionsWithPartial, props: Props]
): FullType<Props> {
    const [{ partial = false, ...options }, props] = decodeOptionalOptions<InterfaceTypeOptionsWithPartial, Props>(args);
    return createType(new InterfaceType(toPropsInfo(props, partial), options));
}

/**
 * Create a type-validator that validates (or parses) an object structure with only optional properties.
 *
 * @remarks
 * This is a basic building block for more complex structured types, can be nested.
 *
 * @param args - the optional name and (required) properties of the new type
 */
export function partial<Props extends Properties>(
    ...args: [props: Props] | [name: string, props: Props] | [options: InterfaceTypeOptions, props: Props]
): PartialType<Props> {
    const [options, props] = decodeOptionalOptions<InterfaceTypeOptions, Props>(args);
    return createType(new InterfaceType(toPropsInfo(props, true), options));
}

function toPropsInfo<Props extends Properties>(props: Props, optional: boolean): PropertiesInfo<Props> {
    const genericPropsInfo: PropertiesInfo = mapValues(props, type => ({ type, optional }));
    return genericPropsInfo as PropertiesInfo<Props>;
}

function getPossibleDiscriminators([key, { type, optional }]: [
    string,
    PropertyInfo<Type<unknown> | ObjectType<unknown>>,
]): PossibleDiscriminator[] {
    if (!optional && 'possibleDiscriminators' in type) {
        return type.possibleDiscriminators.map(({ path, values }) => ({ path: [key, ...path], values }));
    }
    if (type.enumerableLiteralDomain) {
        const values = [...type.enumerableLiteralDomain];
        if (optional && !values.includes(undefined)) values.push(undefined);
        return [{ path: [key], values }];
    }
    return [];
}
