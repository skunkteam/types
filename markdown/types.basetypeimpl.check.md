<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [check](./types.basetypeimpl.check.md)

## BaseTypeImpl.check property

Asserts that a value conforms to this Type and returns the input as is, if it does.

**Signature:**

```typescript
get check(): (this: void, input: unknown) => ResultType;
```

## Remarks

When given a value that does not conform to the Type, throws an exception.

Note that this does not invoke the parser (including the auto-caster). Use [BaseTypeImpl.construct()](./types.basetypeimpl.construct.md)
