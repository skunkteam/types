<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [union](./types.union.md)

## union() function

<b>Signature:</b>

```typescript
export declare function union<Types extends OneOrMore<BaseTypeImpl<unknown>>>(
    ...args: [name: string, types: Types] | [types: Types]
): TypeImpl<UnionType<Types>>;
```

## Parameters

| Parameter | Type                                               | Description |
| --------- | -------------------------------------------------- | ----------- |
| args      | \[name: string, types: Types\] \| \[types: Types\] |             |

<b>Returns:</b>

[TypeImpl](./types.typeimpl.md)<!-- -->&lt;[UnionType](./types.uniontype.md)<!-- -->&lt;Types&gt;&gt;
