<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [IntersectionOfTypeTuple](./types.intersectionoftypetuple.md)

## IntersectionOfTypeTuple type

**Signature:**

```typescript
type IntersectionOfTypeTuple<Tuple> = Tuple extends [
    {
        readonly [designType]: infer A;
    },
]
    ? MergeIntersection<A>
    : Tuple extends [
          {
              readonly [designType]: infer A;
          },
          ...infer Rest,
      ]
    ? MergeIntersection<A & IntersectionOfTypeTuple<Rest>>
    : Record<string, unknown>;
```

**References:** [designType](./types.designtype.md)<!-- -->, [MergeIntersection](./types.mergeintersection.md)<!-- -->, [IntersectionOfTypeTuple](./types.intersectionoftypetuple.md)
