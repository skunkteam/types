<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [MergeIntersection](./types.mergeintersection.md)

## MergeIntersection type

Merge an intersection of types into one type, mostly for tooltip-readability in IDEs.

<b>Signature:</b>

```typescript
export declare type MergeIntersection<T> = T extends Record<PropertyKey, unknown>
    ? {
          [P in keyof T]: MergeIntersection<T[P]>;
      }
    : T;
```

<b>References:</b> [MergeIntersection](./types.mergeintersection.md)
