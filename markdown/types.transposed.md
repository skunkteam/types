<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [Transposed](./types.transposed.md)

## Transposed type

**Signature:**

```typescript
type Transposed<T extends Record<string, string>> = Record<T[keyof T], keyof T>;
```