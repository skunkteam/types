<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [IntersectionType](./types.intersectiontype.md) &gt; [maybeStringify](./types.intersectiontype.maybestringify.md)

## IntersectionType.maybeStringify() method

Create a JSON string of the given value, using the type information of the current type. Matches the specs of `JSON.stringify`<!-- -->.

**Signature:**

```typescript
maybeStringify(value: IntersectionOfTypeTuple<Types>): string;
```

## Parameters

| Parameter | Type                                                                               | Description                                                            |
| --------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| value     | [IntersectionOfTypeTuple](./types.intersectionoftypetuple.md)<!-- -->&lt;Types&gt; | a previously validated or constructed value, must conform to this type |

**Returns:**

string

## Remarks

Only use this method on values that have been validated or constructed by this type. It will use the available type information to efficiently create a stringified version of the value. Unknown (extra) properties of object types are stripped.

Note that this implementation matches the specs of `JSON.stringify` in that it will throw on a `BigInt` and will return `undefined` for other values that are not serializable into JSON.
