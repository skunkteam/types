<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [autoCastAll](./types.autocastall.md)

## autoCastAll() function

Create a recursive autocasting version of the given type.

**Signature:**

```typescript
declare function autoCastAll<T extends BaseTypeImpl<unknown>>(type: T): T;
```

## Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| type      | T    |             |

**Returns:**

T

## Remarks

This will replace any parser in the nested structure with the appropriate autocaster when applicable.