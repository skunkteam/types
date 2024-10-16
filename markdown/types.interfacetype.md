<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [InterfaceType](./types.interfacetype.md)

## InterfaceType class

The implementation behind types created with [object()](./types.object.md) and [partial()](./types.partial.md)<!-- -->.

**Signature:**

```typescript
declare class InterfaceType<Props extends Properties, ResultType extends unknownRecord> extends BaseObjectLikeTypeImpl<ResultType> implements TypedPropertyInformation<Props>
```

**Extends:** [BaseObjectLikeTypeImpl](./types.baseobjectliketypeimpl.md)<!-- -->&lt;ResultType&gt;

**Implements:** [TypedPropertyInformation](./types.typedpropertyinformation.md)<!-- -->&lt;Props&gt;

## Constructors

| Constructor                                                                 | Modifiers | Description                                                       |
| --------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| [(constructor)(propsInfo, options)](./types.interfacetype._constructor_.md) |           | Constructs a new instance of the <code>InterfaceType</code> class |

## Properties

| Property                                                                  | Modifiers             | Type                                                                           | Description                                                                 |
| ------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [basicType](./types.interfacetype.basictype.md)                           | <code>readonly</code> | 'object'                                                                       | The kind of values this type validates.                                     |
| [isDefaultName](./types.interfacetype.isdefaultname.md)                   | <code>readonly</code> | boolean                                                                        |                                                                             |
| [keys](./types.interfacetype.keys.md)                                     | <code>readonly</code> | readonly (keyof Props &amp; keyof ResultType &amp; string)\[\]                 | The keys (property-names) for this object-like type.                        |
| [name](./types.interfacetype.name.md)                                     | <code>readonly</code> | string                                                                         | The name of the Type.                                                       |
| [options](./types.interfacetype.options.md)                               | <code>readonly</code> | [InterfaceTypeOptions](./types.interfacetypeoptions.md)                        |                                                                             |
| [possibleDiscriminators](./types.interfacetype.possiblediscriminators.md) | <code>readonly</code> | readonly [PossibleDiscriminator](./types.possiblediscriminator.md)<!-- -->\[\] |                                                                             |
| [props](./types.interfacetype.props.md)                                   | <code>readonly</code> | Props                                                                          |                                                                             |
| [propsInfo](./types.interfacetype.propsinfo.md)                           | <code>readonly</code> | [PropertiesInfo](./types.propertiesinfo.md)<!-- -->&lt;Props&gt;               |                                                                             |
| [typeConfig](./types.interfacetype.typeconfig.md)                         | <code>readonly</code> | undefined                                                                      | Extra information that is made available by this Type for runtime analysis. |

## Methods

| Method                                                                  | Modifiers              | Description                                                                                                                                |
| ----------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [accept(visitor)](./types.interfacetype.accept.md)                      |                        | Accept a visitor (visitor pattern).                                                                                                        |
| [maybeStringify(value)](./types.interfacetype.maybestringify.md)        |                        | Create a JSON string of the given value, using the type information of the current type. Matches the specs of <code>JSON.stringify</code>. |
| [mergeWith(args)](./types.interfacetype.mergewith.md)                   |                        | Create a new type by merging all properties of the given type into the properties of this type.                                            |
| [omit(args)](./types.interfacetype.omit.md)                             |                        | Create a new type that consists of all properties of the base type, except those mentioned, similar to the builtin <code>Omit</code> type. |
| [pick(args)](./types.interfacetype.pick.md)                             |                        | Create a new type that consists only of the mentioned properties similar to the builtin <code>Pick</code> type.                            |
| [toPartial(name)](./types.interfacetype.topartial.md)                   |                        | Clone this type with all properties marked optional.                                                                                       |
| [typeValidator(input, options)](./types.interfacetype.typevalidator.md) | <code>protected</code> | The actual validation-logic.                                                                                                               |
| [withOptional(args)](./types.interfacetype.withoptional.md)             |                        | Create a type with all properties of the current type, plus the given optional properties.                                                 |
| [withRequired(args)](./types.interfacetype.withrequired.md)             |                        | Create a type with all properties of the current type, plus the given additional required properties.                                      |
