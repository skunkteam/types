<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [withParser](./types.basetypeimpl.withparser.md)

## BaseTypeImpl.withParser() method

Define a new type with the same specs, but with the given parser and an optional new name.

<b>Signature:</b>

```typescript
withParser(...args: [name: string, newConstructor: (i: unknown) => unknown] | [newConstructor: (i: unknown) => unknown]): this;
```

## Parameters

| Parameter | Type                                                                                                           | Description |
| --------- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| args      | \[name: string, newConstructor: (i: unknown) =&gt; unknown\] \| \[newConstructor: (i: unknown) =&gt; unknown\] |             |

<b>Returns:</b>

this

## Remarks

This given parser may throw ValidationErrors to indicate validation failures during parsing.
