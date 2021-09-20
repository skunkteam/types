<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [KeyofType](./types.keyoftype.md)

## KeyofType class

The implementation behind types created with [keyof()](./types.keyof.md) and [valueof()](./types.valueof.md)<!-- -->.

<b>Signature:</b>

```typescript
export declare class KeyofType<T extends Record<string, unknown>, ResultType extends keyof T = keyof T> extends BaseTypeImpl<ResultType>
```

<b>Extends:</b> [BaseTypeImpl](./types.basetypeimpl.md)<!-- -->&lt;ResultType&gt;

## Constructors

| Constructor                                                     | Modifiers | Description                                                   |
| --------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| [(constructor)(keys, name)](./types.keyoftype._constructor_.md) |           | Constructs a new instance of the <code>KeyofType</code> class |

## Properties

| Property                                                                | Modifiers | Type       | Description |
| ----------------------------------------------------------------------- | --------- | ---------- | ----------- |
| [basicType](./types.keyoftype.basictype.md)                             |           | 'string'   |             |
| [enumerableLiteralDomain](./types.keyoftype.enumerableliteraldomain.md) |           | string\[\] |             |
| [keys](./types.keyoftype.keys.md)                                       |           | T          |             |
| [name](./types.keyoftype.name.md)                                       |           | string     |             |
| [typeConfig](./types.keyoftype.typeconfig.md)                           |           | undefined  |             |

## Methods

| Method                                                     | Modifiers | Description |
| ---------------------------------------------------------- | --------- | ----------- |
| [accept(visitor)](./types.keyoftype.accept.md)             |           |             |
| [translate(input)](./types.keyoftype.translate.md)         |           |             |
| [typeValidator(input)](./types.keyoftype.typevalidator.md) |           |             |