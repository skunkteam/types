## API Report File for "@skunkteam/types"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { StandardSchemaV1 } from '@standard-schema/spec';

// @public
export function array<ElementType extends BaseTypeImpl<any>>(...args: [name: string, elementType: ElementType, typeConfig?: ArrayTypeConfig] | [elementType: ElementType, typeConfig?: ArrayTypeConfig]): TypeImpl<ArrayType<ElementType, TypeOf<ElementType>, Array<TypeOf<ElementType>>>>;

// @public
export class ArrayType<ElementType extends BaseTypeImpl<Element>, Element, ResultType extends Element[]> extends BaseTypeImpl<ResultType, ArrayTypeConfig> {
    constructor(elementType: ElementType,
    typeConfig: ArrayTypeConfig, name?: string);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: 'array';
    // (undocumented)
    readonly elementType: ElementType;
    // (undocumented)
    readonly isDefaultName: boolean;
    maybeStringify(value: ResultType): string;
    readonly name: string;
    readonly typeConfig: ArrayTypeConfig;
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
}

// @public
export interface ArrayTypeConfig extends LengthChecksConfig {
    // (undocumented)
    customMessage?: CustomMessage<unknown[], ArrayViolation[]>;
}

// @public
export type ArrayViolation = LengthViolation;

// @public
export function autoCast<T extends BaseTypeImpl<unknown>>(type: T): T;

// @public
export function autoCastAll<T extends BaseTypeImpl<unknown>>(type: T): T;

// @public
export const autoCastFailure: unique symbol;

// @public
export abstract class BaseObjectLikeTypeImpl<ResultType, TypeConfig = unknown> extends BaseTypeImpl<ResultType, TypeConfig> {
    and<Other extends BaseObjectLikeTypeImpl<any, any>>(_other: Other): ObjectType<MergeIntersection<ResultType & Other[typeof designType]>> & TypedPropertyInformation<this['props'] & Other['props']>;
    // (undocumented)
    abstract readonly isDefaultName: boolean;
    // (undocumented)
    abstract readonly possibleDiscriminators: readonly PossibleDiscriminator[];
    // (undocumented)
    abstract readonly props: Properties;
    protected get propsArray(): ReadonlyArray<[string, PropertyInfo]>;
    // (undocumented)
    abstract readonly propsInfo: PropertiesInfo;
}

// @public
export abstract class BaseTypeImpl<ResultType, TypeConfig = unknown> implements TypeLink<ResultType>, StandardSchemaV1<unknown, ResultType> {
    get ['~standard'](): StandardSchemaV1.Props<unknown, ResultType>;
    // @internal
    readonly [designType]: ResultType;
    abstract accept<R>(visitor: Visitor<R>): R;
    andThen<Return, RestArgs extends unknown[]>(fn: (value: ResultType, ...restArgs: RestArgs) => Return): (input: unknown, ...restArgs: RestArgs) => Return;
    assert(input: unknown): asserts input is ResultType;
    protected autoCaster?(this: BaseTypeImpl<ResultType, TypeConfig>, value: unknown): unknown;
    abstract readonly basicType: BasicType | 'mixed';
    get check(): (this: void, input: unknown) => ResultType;
    protected combineConfig(oldConfig: TypeConfig, newConfig: TypeConfig): TypeConfig;
    construct(input: unknown): ResultType;
    // (undocumented)
    protected createAutoCastAllType(): Type<ResultType>;
    protected createResult(input: unknown, result: unknown, validatorResult: ValidationResult): Result<ResultType>;
    protected readonly customValidators: ReadonlyArray<Validator<unknown>>;
    readonly enumerableLiteralDomain?: Iterable<LiteralValue>;
    extendWith<const E>(factory: (type: this) => E): this & E;
    get is(): TypeguardFor<ResultType>;
    literal(input: DeepUnbranded<ResultType>): ResultType;
    maybeStringify(value: ResultType): string | undefined;
    abstract readonly name: string;
    or<Other extends BaseTypeImpl<unknown>>(_other: Other): Type<ResultType | TypeOf<Other>>;
    stringify(value: ResultType): string;
    abstract readonly typeConfig: TypeConfig;
    protected typeParser?(input: unknown, options: ValidationOptions): Result<unknown>;
    protected abstract typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
    validate(input: unknown, options?: ValidationOptions): Result<ResultType>;
    withBrand<const BrandName extends string>(name: BrandName): Type<Branded<ResultType, BrandName>, TypeConfig>;
    withConfig<const BrandName extends string>(name: BrandName, newConfig: TypeConfig): Type<Branded<ResultType, BrandName>, TypeConfig>;
    withConstraint<const BrandName extends string>(name: BrandName, constraint: Validator<ResultType>): Type<Branded<ResultType, BrandName>, TypeConfig>;
    withDefault(...args: [value: DeepUnbranded<ResultType>] | [name: string, value: DeepUnbranded<ResultType>] | [options: WithDefaultOptions, value: DeepUnbranded<ResultType>]): this;
    withName(name: string): this;
    withParser(...args: [newConstructor: (i: unknown) => unknown] | [name: string, newConstructor: (i: unknown) => unknown] | [options: ParserOptions, newConstructor: (i: unknown) => unknown]): this;
    withValidation(validation: Validator<ResultType>): this;
}

// @public
export type BasicType = 'string' | 'number' | 'bigint' | 'boolean' | 'function' | 'object' | 'array' | 'symbol' | 'undefined' | 'null';

// @public
export const boolean: Type<boolean>;

// @public (undocumented)
export function booleanAutoCaster(input: unknown): boolean | typeof autoCastFailure;

// @public
export type Branded<T, BrandName extends string> = T extends WithBrands<infer Base, infer ExistingBrands> ? WithBrands<Base, BrandName | ExistingBrands> : WithBrands<T, BrandName>;

// @public
export const brands: unique symbol;

// @public
export function createType<Impl extends BaseTypeImpl<any, any>>(impl: Impl, override?: Partial<Record<keyof BaseTypeImpl<any, any> | 'typeValidator' | 'typeParser' | 'customValidators', PropertyDescriptor>>): TypeImpl<Impl>;

// @public
export type CustomMessage<T, E = void> = undefined | string | ((got: string, input: T, explanation: E) => string);

// @public
export type DeepUnbranded<T> = T extends readonly [any, ...any[]] | readonly [] ? UnbrandValues<Unbranded<T>> : T extends Array<infer E> ? Array<DeepUnbranded<E>> : T extends ReadonlyArray<infer E> ? ReadonlyArray<DeepUnbranded<E>> : T extends Record<string, unknown> ? UnbrandValues<Unbranded<T>> : Unbranded<T>;

// @public
export const designType: unique symbol;

// @public
export interface Failure {
    details: OneOrMore<FailureDetails>;
    input: unknown;
    // (undocumented)
    ok: false;
    parserInput?: unknown;
    type: BaseTypeImpl<unknown>;
}

// @public
export type FailureDetails = ValidationDetails & MessageDetails;

// @public
export type FullType<Props extends Properties> = TypeImpl<InterfaceType<Simplify<Props>, Simplify<TypeOfProperties<Writable<Props>>>>>;

// @public (undocumented)
export type int = The<typeof int>;

// @public (undocumented)
export const int: Type<Branded<number, 'int'>, NumberTypeConfig>;

// @public
export interface InterfaceMergeOptions {
    name?: string | null;
    omitParsers?: true;
    omitValidations?: true;
}

// @public
export interface InterfacePickOptions {
    applyParser?: boolean;
    name?: string | null;
    omitValidations?: true;
}

// @public
export class InterfaceType<Props extends Properties, ResultType extends unknownRecord> extends BaseObjectLikeTypeImpl<ResultType> implements TypedPropertyInformation<Props> {
    constructor(
    propsInfo: PropertiesInfo<Props>, options: InterfaceTypeOptions);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: 'object';
    // (undocumented)
    readonly isDefaultName: boolean;
    readonly keys: readonly (keyof Props & keyof ResultType & string)[];
    maybeStringify(value: ResultType): string;
    mergeWith<OtherProps extends Properties, OtherType extends unknownRecord>(...args: [type: InterfaceType<OtherProps, OtherType>] | [name: string, type: InterfaceType<OtherProps, OtherType>] | [options: InterfaceMergeOptions, type: InterfaceType<OtherProps, OtherType>]): MergeType<Props, ResultType, OtherProps, OtherType>;
    readonly name: string;
    omit<const Key extends keyof Props & keyof ResultType & string>(...args: [keys: OneOrMore<Key>] | [name: string, keys: OneOrMore<Key>] | [options: InterfacePickOptions, keys: OneOrMore<Key>]): PickType<Props, ResultType, Exclude<keyof Props & keyof ResultType & string, Key>>;
    // (undocumented)
    readonly options: InterfaceTypeOptions;
    pick<const Key extends keyof Props & keyof ResultType & string>(...args: [keys: OneOrMore<Key>] | [name: string, keys: OneOrMore<Key>] | [options: InterfacePickOptions, keys: OneOrMore<Key>]): PickType<Props, ResultType, Key>;
    // (undocumented)
    readonly possibleDiscriminators: readonly PossibleDiscriminator[];
    // (undocumented)
    readonly props: Props;
    // (undocumented)
    readonly propsInfo: PropertiesInfo<Props>;
    toPartial(name?: string): PartialType<Props>;
    readonly typeConfig: undefined;
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
    withOptional<PartialProps extends Properties>(...args: [props: PartialProps] | [name: string, props: PartialProps] | [options: InterfaceMergeOptions, props: PartialProps]): MergeType<Props, ResultType, PartialProps, Partial<TypeOfProperties<Writable<PartialProps>>>>;
    withRequired<OtherProps extends Properties>(...args: [props: OtherProps] | [name: string, props: OtherProps] | [options: InterfaceMergeOptions, props: OtherProps]): MergeType<Props, ResultType, OtherProps, TypeOfProperties<Writable<OtherProps>>>;
}

// @public
export interface InterfaceTypeOptions {
    checkOnly?: boolean;
    name?: string;
    strictMissingKeys?: boolean;
}

// @public (undocumented)
export interface InterfaceTypeOptionsWithPartial extends InterfaceTypeOptions {
    // @deprecated
    partial?: boolean;
}

// @public
export function intersection<Types extends OneOrMore<BaseObjectLikeTypeImpl<unknown>>>(...args: [name: string, types: Types] | [types: Types]): TypeImpl<IntersectionType<Types>>;

// @public (undocumented)
export type IntersectionOfTypeTuple<Tuple> = Tuple extends [{
    readonly [designType]: infer A;
}] ? MergeIntersection<A> : Tuple extends [{
    readonly [designType]: infer A;
}, ...infer Rest] ? MergeIntersection<A & IntersectionOfTypeTuple<Rest>> : Record<string, unknown>;

// @public
export class IntersectionType<Types extends OneOrMore<BaseObjectLikeTypeImpl<unknown>>> extends BaseObjectLikeTypeImpl<IntersectionOfTypeTuple<Types>, undefined> implements TypedPropertyInformation<PropertiesOfTypeTuple<Types>> {
    constructor(types: Types, name?: string);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: 'object';
    // (undocumented)
    readonly combinedName: string;
    // (undocumented)
    readonly isDefaultName: boolean;
    maybeStringify(value: IntersectionOfTypeTuple<Types>): string;
    readonly name: string;
    // (undocumented)
    readonly possibleDiscriminators: readonly PossibleDiscriminator[];
    // (undocumented)
    readonly props: PropertiesOfTypeTuple<Types>;
    // (undocumented)
    readonly propsInfo: PropertiesInfo<PropertiesOfTypeTuple<Types>>;
    readonly typeConfig: undefined;
    // (undocumented)
    readonly types: Types;
    protected typeValidator(input: unknown, options: ValidationOptions): Result<IntersectionOfTypeTuple<Types>>;
}

// @public
export function isType(value: unknown): value is Type<unknown>;

// @public (undocumented)
export function keyof<T extends Record<string, unknown>>(...args: [name: string, keys: T] | [keys: T]): TypeImpl<KeyofType<T>>;

// @public
export class KeyofType<T extends Record<string, unknown>, ResultType extends keyof T = keyof T> extends BaseTypeImpl<ResultType> {
    constructor(keys: T,
    name?: string);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: 'string';
    readonly enumerableLiteralDomain: string[];
    // (undocumented)
    readonly keys: T;
    readonly name: string;
    // (undocumented)
    translate(input: unknown): T[keyof T];
    readonly typeConfig: undefined;
    protected typeValidator(input: unknown): Result<ResultType>;
}

// @public (undocumented)
export interface LengthChecksConfig {
    // (undocumented)
    maxLength?: number;
    // (undocumented)
    minLength?: number;
}

// @public (undocumented)
export type LengthViolation = 'minLength' | 'maxLength';

// @public (undocumented)
export function literal<const T extends LiteralValue>(value: T): TypeImpl<LiteralType<T>>;

// @public
export class LiteralType<ResultType extends LiteralValue> extends BaseTypeImpl<ResultType> {
    constructor(value: ResultType);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: BasicType;
    readonly enumerableLiteralDomain: ResultType[];
    readonly name: string;
    readonly typeConfig: undefined;
    protected typeValidator(input: unknown): Result<ResultType>;
    // (undocumented)
    readonly value: ResultType;
}

// @public
export type LiteralValue = string | number | boolean | null | undefined | void;

// @public
export type MergeIntersection<T> = T extends Record<PropertyKey, unknown> ? Simplify<T> : T;

// @public
export type MergeType<Props extends Properties, ResultType, OtherProps extends Properties, OtherResultType> = TypeImpl<InterfaceType<Simplify<Omit<Props, keyof OtherProps> & OtherProps>, Simplify<Omit<ResultType, keyof OtherResultType> & OtherResultType>>>;

// @public
export type MessageDetails = Partial<ValidationDetails> & {
    path?: PropertyKey[];
    context?: string;
    omitInput?: boolean;
} & ({
    kind?: undefined;
} | {
    kind: 'missing property';
    property: string;
} | {
    kind: 'invalid key';
    property: string;
    failure: Failure;
} | {
    kind: 'invalid literal';
    expected: LiteralValue | LiteralValue[];
} | {
    kind: 'invalid basic type';
    expected: BasicType | BasicType[];
    expectedValue?: LiteralValue;
} | {
    kind: 'length out of range';
    violation: LengthViolation;
    config: LengthChecksConfig;
} | {
    kind: 'input out of range';
    violation: NumberViolation;
    config: NumberTypeConfig;
} | {
    kind: 'pattern mismatch';
    config: StringTypeConfig;
} | {
    kind: 'union';
    failures: Failure[];
} | {
    kind: 'custom message';
    message: string;
});

// @public (undocumented)
export const nullType: TypeImpl<LiteralType<null>>;

// @public (undocumented)
export const number: Type<number, NumberTypeConfig>;

// @public (undocumented)
export function numberAutoCaster(input: unknown): number | typeof autoCastFailure;

// @public
export type NumberTypeConfig = {
    multipleOf?: number;
    customMessage?: CustomMessage<number, NumberViolation[]> | Partial<Record<NumberViolation, CustomMessage<number, NumberViolation>>>;
} & ({
    minExclusive?: number;
    min?: undefined;
} | {
    minExclusive?: undefined;
    min?: number;
}) & ({
    maxExclusive?: number;
    max?: undefined;
} | {
    maxExclusive?: undefined;
    max?: number;
});

// @public
export type NumberViolation = 'min' | 'max' | 'multipleOf';

// @public
export function object<Props extends Properties>(...args: [props: Props] | [name: string, props: Props] | [options: InterfaceTypeOptionsWithPartial, props: Props]): FullType<Props>;

// @public
export type ObjectType<ResultType, TypeConfig = unknown> = TypeImpl<BaseObjectLikeTypeImpl<ResultType, TypeConfig>>;

// @public
export type OneOrMore<T> = [T, ...T[]];

// @public
export interface ParserOptions {
    chain?: boolean;
    name?: string;
}

// @public
export function partial<Props extends Properties>(...args: [props: Props] | [name: string, props: Props] | [options: InterfaceTypeOptions, props: Props]): PartialType<Props>;

// @public
export type PartialType<Props extends Properties> = TypeImpl<InterfaceType<Simplify<Props>, Simplify<Partial<TypeOfProperties<Writable<Props>>>>>>;

// @public (undocumented)
export function pattern<const BrandName extends string>(name: BrandName, regExp: RegExp, customMessage?: StringTypeConfig['customMessage']): Type<Branded<string, BrandName>, StringTypeConfig>;

// @public
export type PickType<Props extends Properties, ResultType, Key extends keyof Props & keyof ResultType & string> = TypeImpl<InterfaceType<Simplify<Pick<Props, Key>>, Simplify<Pick<ResultType, Key>>>>;

// @public
export type PossibleDiscriminator = {
    readonly path: readonly string[];
    readonly values: readonly LiteralValue[];
    readonly mapping?: ReadonlyArray<{
        type: BaseTypeImpl<unknown>;
        values: readonly LiteralValue[];
    }>;
};

// @public (undocumented)
export type Primitive = LiteralValue | bigint | symbol;

// @public
export function printKey(key: string): string;

// @public
export function printPath(path: ReadonlyArray<PropertyKey>): string;

// @public
export function printValue(input: unknown, budget?: number, visited?: Set<unknown>): string;

// @public
export type Properties = Record<string, Type<any>>;

// @public
export type PropertiesInfo<Props extends Properties = Properties> = {
    [Key in keyof Props]: PropertyInfo<Props[Key]>;
};

// @public (undocumented)
export type PropertiesOfTypeTuple<Tuple> = Tuple extends [{
    readonly props: infer A;
}] ? MergeIntersection<A> : Tuple extends [{
    readonly props: infer A;
}, ...infer Rest] ? MergeIntersection<A & PropertiesOfTypeTuple<Rest>> : Properties;

// @public
export type PropertyInfo<T extends Type<unknown> = Type<unknown>> = {
    optional: boolean;
    type: T;
};

// @public
export function record<KeyType extends number | string, ValueType>(...args: [name: string, keyType: BaseTypeImpl<KeyType>, valueType: BaseTypeImpl<ValueType>, strict?: boolean] | [keyType: BaseTypeImpl<KeyType>, valueType: BaseTypeImpl<ValueType>, strict?: boolean]): TypeImpl<RecordType<BaseTypeImpl<KeyType>, KeyType, BaseTypeImpl<ValueType>, ValueType>>;

// @public
export class RecordType<KeyTypeImpl extends BaseTypeImpl<KeyType>, KeyType extends number | string, ValueTypeImpl extends BaseTypeImpl<ValueType>, ValueType, ResultType extends Record<KeyType, ValueType> = Record<KeyType, ValueType>> extends BaseTypeImpl<ResultType> {
    constructor(keyType: KeyTypeImpl, valueType: ValueTypeImpl, name?: string, strict?: boolean);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: 'object';
    // (undocumented)
    readonly isDefaultName: boolean;
    // (undocumented)
    readonly keyType: KeyTypeImpl;
    maybeStringify(value: ResultType): string;
    readonly name: string;
    // (undocumented)
    readonly strict: boolean;
    readonly typeConfig: undefined;
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
    // (undocumented)
    readonly valueType: ValueTypeImpl;
}

// @public
function reportError_2(root: Failure, level?: number, omitInput?: boolean): string;
export { reportError_2 as reportError }

// @public
export type Result<T> = Success<T> | Failure;

// @public (undocumented)
export type SimpleAcceptVisitor<ResultType, TypeConfig> = <R>(type: SimpleType<ResultType, TypeConfig>, visitor: Visitor<R>) => R;

// @public
export class SimpleType<ResultType, TypeConfig> extends BaseTypeImpl<ResultType, TypeConfig> {
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: BasicType | 'mixed';
    static create<ResultType, TypeConfig>(name: string, basicType: BasicType | 'mixed', simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType, TypeConfig>) => ValidationResult, options: SimpleTypeOptions<ResultType, TypeConfig>): Type<ResultType, TypeConfig>;
    static create<ResultType>(name: string, basicType: BasicType | 'mixed', simpleValidator: (input: unknown, options: ValidationOptions, type: SimpleType<ResultType, undefined>) => ValidationResult, options?: Omit<SimpleTypeOptions<ResultType, undefined>, 'typeConfig'>): Type<ResultType, undefined>;
    readonly name: string;
    readonly typeConfig: TypeConfig;
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
}

// @public (undocumented)
export interface SimpleTypeOptions<ResultType, TypeConfig> {
    // (undocumented)
    acceptVisitor?: SimpleAcceptVisitor<ResultType, TypeConfig>;
    // (undocumented)
    autoCaster?: BaseTypeImpl<ResultType, TypeConfig>['autoCaster'];
    // (undocumented)
    combineConfig?: BaseTypeImpl<ResultType, TypeConfig>['combineConfig'];
    // (undocumented)
    enumerableLiteralDomain?: BaseTypeImpl<ResultType, TypeConfig>['enumerableLiteralDomain'];
    // (undocumented)
    maybeStringify?: (value: ResultType) => string | undefined;
    // (undocumented)
    typeConfig: BaseTypeImpl<ResultType, TypeConfig>['typeConfig'];
}

// @public
export type Simplify<T> = {
    [P in keyof T]: T[P];
} & {};

// @public
export const string: Type<string, StringTypeConfig>;

// @public
export interface StringTypeConfig extends LengthChecksConfig {
    // (undocumented)
    customMessage?: CustomMessage<string, StringViolation[]> | Partial<Record<StringViolation, CustomMessage<string, StringViolation>>>;
    // (undocumented)
    pattern?: RegExp;
}

// @public
export type StringViolation = 'pattern' | LengthViolation;

// @public
export interface Success<T> {
    // (undocumented)
    ok: true;
    value: T;
}

// @public
export type The<T> = TypeOf<T>;

// @public (undocumented)
export type Transposed<T extends Record<string, string>> = Record<T[keyof T], keyof T>;

// @public
export type Type<ResultType, TypeConfig = unknown> = TypeImpl<BaseTypeImpl<ResultType, TypeConfig>>;

// @public
export interface TypedPropertyInformation<Props extends Properties> {
    // (undocumented)
    readonly props: Props;
    // (undocumented)
    readonly propsInfo: PropertiesInfo<Props>;
}

// @public
export type TypeguardFor<ResultType> = <Input>(this: void, input: Input) => input is TypeguardResult<ResultType, Input>;

// @public
export type TypeguardResult<ResultType, Input> = unknown extends Input ? Input & ResultType : [
Extract<Input, ResultType>
] extends [never] ? Input & ResultType : Extract<Input, ResultType>;

// @public
export type TypeImpl<Impl extends BaseTypeImpl<any, any>> = Impl & {
    new (input: unknown): TypeOf<Impl>;
    (this: void, input: unknown): TypeOf<Impl>;
};

// @public
export interface TypeLink<AssociatedType> {
    readonly [designType]: AssociatedType;
}

// @public
export type TypeOf<T> = T extends {
    readonly [designType]: infer Q;
} ? Q : never;

// @public
export type TypeOfProperties<T extends Properties> = {
    [P in keyof T]: MergeIntersection<TypeOf<T[P]>>;
};

// @public
export type Unbranded<T> = T extends WithBrands<infer Base, any> ? Base : T;

// @public (undocumented)
export type UnbrandValues<T> = {
    [P in keyof T]: DeepUnbranded<T[P]>;
};

// @public (undocumented)
export const undefinedType: TypeImpl<LiteralType<undefined>>;

// @public (undocumented)
export function union<Types extends OneOrMore<BaseTypeImpl<unknown>>>(...args: [name: string, types: Types] | [types: Types]): TypeImpl<UnionType<Types>>;

// @public
export class UnionType<Types extends OneOrMore<BaseTypeImpl<unknown>>, ResultType extends TypeOf<Types[number]> = TypeOf<Types[number]>> extends BaseObjectLikeTypeImpl<ResultType> {
    constructor(types: Types, name?: string);
    accept<R>(visitor: Visitor<R>): R;
    readonly basicType: BasicType | "mixed";
    // (undocumented)
    readonly collapsedTypes: Types;
    readonly enumerableLiteralDomain: Set<LiteralValue> | undefined;
    // (undocumented)
    findApplicableSubtype(input: unknown): BaseTypeImpl<unknown> | undefined;
    // (undocumented)
    readonly isDefaultName: boolean;
    maybeStringify(value: ResultType): string | undefined;
    readonly name: string;
    // (undocumented)
    readonly possibleDiscriminators: readonly PossibleDiscriminator[];
    // (undocumented)
    readonly props: Properties;
    // (undocumented)
    readonly propsInfo: PropertiesInfo<Properties>;
    readonly typeConfig: undefined;
    // (undocumented)
    readonly types: Types;
    protected typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
}

// @public
export const unknown: Type<unknown>;

// @public
export type unknownArray = unknown[];

// @public
export const unknownArray: Type<unknownArray>;

// @public
export type unknownRecord = Record<string, unknown>;

// @public
export const unknownRecord: Type<unknownRecord>;

// @public
export type ValidationDetails = {
    type: BaseTypeImpl<unknown>;
    input: unknown;
    parserInput?: unknown;
};

// @public
export class ValidationError extends Error implements Failure {
    // (undocumented)
    readonly details: OneOrMore<FailureDetails>;
    static fromFailure(failure: Failure): ValidationError;
    // (undocumented)
    readonly input: unknown;
    // (undocumented)
    readonly name = "ValidationError";
    // (undocumented)
    readonly ok = false;
    static try<Return>({ type, input }: Pick<Failure, 'type' | 'input'>, fn: () => Return): Result<Return>;
    // (undocumented)
    readonly type: BaseTypeImpl<unknown>;
}

// @public
export type ValidationMode = 'check' | 'construct';

// @public (undocumented)
export interface ValidationOptions {
    // (undocumented)
    mode: ValidationMode;
    // @internal (undocumented)
    visited?: Map<unknown, Map<unknown, Result<unknown>>>;
}

// @public
export type ValidationResult = undefined | boolean | string | MessageDetails | Iterable<string | MessageDetails>;

// @public
export type Validator<ResultType> = (input: ResultType, options: ValidationOptions) => ValidationResult;

// @public (undocumented)
export function valueof<T extends Record<string, string>>(...args: [name: string, obj: T] | [obj: T]): TypeImpl<KeyofType<Transposed<T>>>;

// @public
export interface Visitor<R> {
    // (undocumented)
    visitArrayType(type: ArrayType<BaseTypeImpl<unknown>, unknown, unknown[]>): R;
    // (undocumented)
    visitBooleanType(type: BaseTypeImpl<boolean>): R;
    // (undocumented)
    visitCustomType(type: BaseTypeImpl<unknown>): R;
    // (undocumented)
    visitIntersectionType(type: IntersectionType<OneOrMore<BaseObjectLikeTypeImpl<unknown>>>): R;
    // (undocumented)
    visitKeyofType(type: KeyofType<Record<any, any>, any>): R;
    // (undocumented)
    visitLiteralType(type: LiteralType<LiteralValue>): R;
    // (undocumented)
    visitNumberType(type: BaseTypeImpl<number, NumberTypeConfig>): R;
    // (undocumented)
    visitObjectType(type: InterfaceType<Properties, unknownRecord>): R;
    // (undocumented)
    visitRecordType(type: RecordType<BaseTypeImpl<number | string>, number | string, BaseTypeImpl<unknown>, unknown>): R;
    // (undocumented)
    visitStringType(type: BaseTypeImpl<string, StringTypeConfig>): R;
    // (undocumented)
    visitUnionType(type: UnionType<OneOrMore<BaseTypeImpl<unknown>>, unknown>): R;
    // (undocumented)
    visitUnknownArrayType(type: BaseTypeImpl<unknown[]>): R;
    // (undocumented)
    visitUnknownRecordType(type: BaseTypeImpl<Record<string, unknown>>): R;
    // (undocumented)
    visitUnknownType(type: BaseTypeImpl<unknown>): R;
}

// @public (undocumented)
export const voidType: TypeImpl<LiteralType<void>>;

// @public (undocumented)
export type WithBrands<T, BrandNames extends string> = T & {
    readonly [brands]: {
        [P in BrandNames]: true;
    };
};

// @public
export interface WithDefaultOptions {
    clone?: boolean;
    name?: string;
}

// @public
export type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};

```
