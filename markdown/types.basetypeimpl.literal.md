<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [literal](./types.basetypeimpl.literal.md)

## BaseTypeImpl.literal() method

Calls any registered parsers or auto-caster, verifies that the resulting value conforms to this Type and returns it if it does.

<b>Signature:</b>

```typescript
literal(input: DeepUnbranded<ResultType>): ResultType;
```

## Parameters

| Parameter | Type                                                                | Description                           |
| --------- | ------------------------------------------------------------------- | ------------------------------------- |
| input     | [DeepUnbranded](./types.deepunbranded.md)<!-- -->&lt;ResultType&gt; | the input value to parse and validate |

<b>Returns:</b>

ResultType

## Remarks

When given a value that either cannot be parsed by the optional parser or does not conform to the Type, throws an exception.

This is the same as [BaseTypeImpl.construct()](./types.basetypeimpl.construct.md)<!-- -->, but accepts an argument that has a similar structure to the type itself, so code editors will offer code completion for this literal argument.

Example:

```typescript
const User = object('User', { id: int });
const user = User.literal({
    // proper code completion here
    id: 1234,
});
```