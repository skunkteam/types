import { autoCast, autoCastAll } from '../autocast';
import { BaseObjectLikeTypeImpl, BaseTypeImpl, createType, type TypedPropertyInformation } from '../base-type';
import type {
    MessageDetails,
    ObjectType,
    OneOrMore,
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
    hasOwnProperty,
    humanList,
    interfaceStringify,
    isOneOrMore,
    mapValues,
    plural,
    prependPathToDetails,
    printKey,
    stringStringify,
    wrapperName,
} from '../utils';
import type { intersection } from './intersection';
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
    /**
     * Mark all properties as optional in this type.
     *
     * @remarks
     * Note that this is NOT reflected in the resulting TypeScript type!
     *
     * @deprecated
     * Use the {@link partial} function instead to get proper TypeScript typings.
     */
    partial?: boolean;
}

/**
 * Options for {@link InterfaceType.withOptional}, {@link InterfaceType.withRequired} and {@link InterfaceType.mergeWith}.
 */
export interface InterfaceMergeOptions {
    /**
     * The optional name for the new type, or `null` to force a generated TypeScript-like name.
     *
     * @remarks
     * When omitted, it will follow the name of original type (on the left). It will either use the custom name of that type or generate a
     * new default TypeScript-like name if the type did not have a custom name.
     *
     * Use this `name` setting with a `string` to provide a new custom name or use `null` to force a generated TypeScript-like name, even if the
     * original type has a custom name.
     */
    name?: string | null;

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
     *
     * Alternatively, it is always possible to use an {@link intersection} instead.
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
     *
     * Alternatively, it is always possible to use an {@link intersection} instead.
     */
    omitParsers?: true;
}

/**
 * Options for {@link InterfaceType.pick} and {@link InterfaceType.omit}.
 */
export interface InterfacePickOptions {
    /**
     * The optional name for the new type, or `null` to force a generated TypeScript-like name.
     *
     * @remarks
     * When omitted, it will follow the name of original type (on the left). It will either use the custom name of that type or generate a
     * new default TypeScript-like name if the type did not have a custom name.
     *
     * Use this `name` setting with a `string` to provide a new custom name or use `null` to force a generated TypeScript-like name, even if
     * the original type has a custom name.
     */
    name?: string | null;

    /**
     * Suppress the error about existing custom validations on the base type.
     *
     * @remarks
     * Validations are not reused when picking or omitting properties from a base type. This is because validations work on the original
     * base type. The new type, with some properties omitted, is not assignable to the original type. Therefore, we cannot reliably call the
     * validations with instances of the new type.
     *
     * When a custom validation is encountered by Skunk Team types, an Error will be thrown. Use this option to ignore the validations and
     * continue with the pick or omit operation.
     *
     * This is to ensure that custom validations are never accidentally lost.
     */
    omitValidations?: true;

    /**
     * Choose whether to apply the custom parser from the base type onto the newly "picked type" or not.
     *
     * @remarks
     * By default, custom parsers (i.e. parsers that are added to a type using {@link BaseTypeImpl.withParser} or
     * {@link autoCast}) are not reused when a new type is created using {@link InterfaceType.pick} and
     * {@link InterfaceType.omit}.
     *
     * However, it is possible to reuse a parser that is set on the base type. Parsers have a single input of type `unknown` and may produce
     * anything (also with type `unknown`). The result of a parser will always be validated afterwards by the type it is applied to.
     * Technically, any parser is applicable to any type, but it might not make sense to do so. Therefore, you can choose to apply it or not
     * with this option.
     *
     * If a custom parser is found on the base type, then this options is mandatory.
     */
    applyParser?: boolean;
}

/** Result of the {@link object} function. */
export type FullType<Props extends Properties> = TypeImpl<InterfaceType<Simplify<Props>, Simplify<TypeOfProperties<Writable<Props>>>>>;

/** Result of the {@link partial} function and the {@link InterfaceType.toPartial} method. */
export type PartialType<Props extends Properties> = TypeImpl<
    InterfaceType<Simplify<Props>, Simplify<Partial<TypeOfProperties<Writable<Props>>>>>
>;

/** Result of the {@link InterfaceType.withOptional}, {@link InterfaceType.withRequired} and {@link InterfaceType.mergeWith} methods. */
export type MergeType<Props extends Properties, ResultType, OtherProps extends Properties, OtherResultType> = TypeImpl<
    InterfaceType<Simplify<Omit<Props, keyof OtherProps> & OtherProps>, Simplify<Omit<ResultType, keyof OtherResultType> & OtherResultType>>
>;

/** Result of the {@link InterfaceType.pick} and {@link InterfaceType.omit} methods. */
export type PickType<Props extends Properties, ResultType, Key extends keyof Props & keyof ResultType & string> = TypeImpl<
    InterfaceType<Simplify<Pick<Props, Key>>, Simplify<Pick<ResultType, Key>>>
>;

/**
 * The implementation behind types created with {@link object} and {@link partial}.
 */
export class InterfaceType<Props extends Properties, ResultType extends unknownRecord>
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
    readonly keys = Object.keys(this.propsInfo) as ReadonlyArray<keyof Props & keyof ResultType & string>;
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
    mergeWith<OtherProps extends Properties, OtherType extends unknownRecord>(
        ...args:
            | [type: InterfaceType<OtherProps, OtherType>]
            | [name: string, type: InterfaceType<OtherProps, OtherType>]
            | [options: InterfaceMergeOptions, type: InterfaceType<OtherProps, OtherType>]
    ): MergeType<Props, ResultType, OtherProps, OtherType> {
        const [opts, other] = decodeOptionalOptions<InterfaceMergeOptions, InterfaceType<OtherProps, OtherType>>(args);
        return this._mergeWith(opts, other.propsInfo, other.customValidators, !!other.typeParser, 'mergeWith');
    }

    private _mergeWith<OtherProps extends Properties, OtherType>(
        { name, omitParsers, omitValidations }: Partial<InterfaceMergeOptions>,
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
            new InterfaceType(propsInfo as PropertiesInfo<Omit<Props, keyof OtherProps> & OtherProps>, {
                ...this.options,
                name: this._deriveName(name, s => s),
            }),
            { customValidators: { configurable: true, value: customValidators } },
        );
    }

    /**
     * Create a new type that consists only of the mentioned properties similar to the builtin `Pick` type.
     */
    pick<const Key extends keyof Props & keyof ResultType & string>(
        ...args: [keys: OneOrMore<Key>] | [name: string, keys: OneOrMore<Key>] | [options: InterfacePickOptions, keys: OneOrMore<Key>]
    ): PickType<Props, ResultType, Key> {
        const [opts, keys] = decodeOptionalOptions<InterfacePickOptions, OneOrMore<Key>>(args);
        return this._pick(opts, keys, 'pick', name => `Pick<${name}, ${keys.map(stringStringify).join(' | ')}>`);
    }

    /**
     * Create a new type that consists of all properties of the base type, except those mentioned, similar to the builtin `Omit` type.
     */
    omit<const Key extends keyof Props & keyof ResultType & string>(
        ...args: [keys: OneOrMore<Key>] | [name: string, keys: OneOrMore<Key>] | [options: InterfacePickOptions, keys: OneOrMore<Key>]
    ): PickType<Props, ResultType, Exclude<keyof Props & keyof ResultType & string, Key>> {
        const [opts, keys] = decodeOptionalOptions<InterfacePickOptions, OneOrMore<Key>>(args);
        const keysToOmit = new Set<string>(keys);
        const pickKeys = this.keys.filter(key => !keysToOmit.delete(key));
        if (!isOneOrMore(pickKeys)) throw new Error(`Error in ${this.name}.omit(): All properties omitted.`);
        // Next, we also want to check that no keys were given that are not found in the base type. Those keys still remain in the
        // `keysToOmit` set. We can reuse the error checking in the _pick method by simply adding them to the list of keys to pick here:
        pickKeys.push(...keysToOmit);
        return this._pick<Exclude<keyof Props & keyof ResultType & string, Key>>(
            opts,
            pickKeys as OneOrMore<Exclude<keyof Props & keyof ResultType & string, Key>>,
            'omit',
            name => `Omit<${name}, ${keys.map(stringStringify).join(' | ')}>`,
        );
    }

    private _pick<const Key extends keyof Props & keyof ResultType & string>(
        { name, applyParser, omitValidations }: InterfacePickOptions,
        keys: OneOrMore<Key>,
        method: string,
        onCustomName: (name: string) => string,
    ): PickType<Props, ResultType, Key> {
        let typeParser;
        if (this.typeParser) {
            if (applyParser == null) {
                throw new Error(
                    `Error in ${this.name}.${method}(): The base type has a custom parser. Choose whether to reuse this parser with the ` +
                        '`applyParser` option.',
                );
            }
            // eslint-disable-next-line @typescript-eslint/unbound-method
            typeParser = applyParser ? this.typeParser : undefined;
        }
        if (!omitValidations && this.customValidators.length) {
            throw new Error(
                `Error in ${this.name}.${method}(): Operation not allowed because the base type has custom validations applied. Use ` +
                    '`omitValidations` to prevent this error.',
            );
        }
        const propsInfo: PropertiesInfo = {};
        const notFound = [];
        for (const key of keys) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            (propsInfo[key] = this.propsInfo[key]) || notFound.push(key);
        }
        if (notFound.length) {
            throw new Error(
                `Error in ${this.name}.${method}(): Operations mentions one or more keys that do not exist on the base type: ` +
                    `${humanList(notFound, 'and', stringStringify)}.`,
            );
        }
        return createType(
            new InterfaceType(propsInfo as PropertiesInfo<Pick<Props, Key>>, {
                ...this.options,
                name: this._deriveName(name, onCustomName),
            }),
            {
                typeParser: { configurable: true, value: typeParser },
            },
        );
    }

    private _deriveName(nameOption: string | null | undefined, onCustomName: (name: string) => string): string | undefined {
        switch (nameOption) {
            case null:
                return undefined;
            case undefined:
                return this.isDefaultName ? undefined : onCustomName(this.name);
            default:
                return nameOption;
        }
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
    const name = wrapperName(this, 'AutoCastAll');
    const props: PropertiesInfo = {};
    for (const [key, { type, optional: partial }] of this.propsArray) {
        props[key] = { type: autoCastAll(type), optional: partial };
    }
    return createType(autoCast(new InterfaceType(props, { ...this.options, name })));
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
    return createType(new InterfaceType<Props, TypeOfProperties<Writable<Props>>>(toPropsInfo(props, partial), options));
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
    return createType(new InterfaceType<Props, Partial<TypeOfProperties<Writable<Props>>>>(toPropsInfo(props, true), options));
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
