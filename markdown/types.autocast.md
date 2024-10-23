<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [autoCast](./types.autocast.md)

## autoCast() function

Returns the same type, but with an auto-casting default parser installed.

**Signature:**

```typescript
declare function autoCast<T extends BaseTypeImpl<unknown>>(type: T): T;
```

## Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| type      | T    |             |

**Returns:**

T

## Remarks

Each type implementation provides its own auto-cast rules. See builtin types for examples of auto-cast rules.