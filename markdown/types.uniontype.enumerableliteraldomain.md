<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [UnionType](./types.uniontype.md) &gt; [enumerableLiteralDomain](./types.uniontype.enumerableliteraldomain.md)

## UnionType.enumerableLiteralDomain property

The set of valid literals if enumerable.

**Signature:**

```typescript
readonly enumerableLiteralDomain: Set<LiteralValue> | undefined;
```

## Remarks

If a Type (only) accepts a known number of literal values, these should be enumerated in this set. A record with such a domain as key-type
