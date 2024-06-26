<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [or](./types.basetypeimpl.or.md)

## BaseTypeImpl.or() method

Union this Type with another Type.

**Signature:**

```typescript
or<Other extends BaseTypeImpl<unknown>>(_other: Other): Type<ResultType | TypeOf<Other>>;
```

## Parameters

| Parameter | Type  | Description |
| --------- | ----- | ----------- |
| \_other   | Other |             |

**Returns:**

[Type](./types.type.md)<!-- -->&lt;ResultType \| [TypeOf](./types.typeof.md)<!-- -->&lt;Other&gt;&gt;

## Remarks

See [UnionType](./types.uniontype.md) for more information about unions.
