<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [SimpleType](./types.simpletype.md) &gt; [accept](./types.simpletype.accept.md)

## SimpleType.accept() method

Accept a visitor (visitor pattern).

**Signature:**

```typescript
accept<R>(visitor: Visitor<R>): R;
```

## Parameters

| Parameter | Type                                           | Description           |
| --------- | ---------------------------------------------- | --------------------- |
| visitor   | [Visitor](./types.visitor.md)<!-- -->&lt;R&gt; | the visitor to accept |

**Returns:**

R

## Remarks

Note that, while it can be used to traverse a tree, this is not part of this pattern. The visitor that visits a particular type can decide to visit children of that type (or not). See `./testutils.ts` for an example.
