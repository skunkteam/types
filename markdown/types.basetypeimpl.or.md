<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [or](./types.basetypeimpl.or.md)

## BaseTypeImpl.or() method

Union this Type with another Type.

<b>Signature:</b>

```typescript
or<Other extends BaseTypeImpl<unknown>>(_other: Other): TypeImpl<UnionType<[this, Other]>>;
```

## Parameters

| Parameter | Type  | Description |
| --------- | ----- | ----------- |
| \_other   | Other |             |

<b>Returns:</b>

[TypeImpl](./types.typeimpl.md)<!-- -->&lt;[UnionType](./types.uniontype.md)<!-- -->&lt;\[this, Other\]&gt;&gt;

## Remarks

See [UnionType](./types.uniontype.md) for more information about unions.