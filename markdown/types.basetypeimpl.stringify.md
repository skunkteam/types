<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [stringify](./types.basetypeimpl.stringify.md)

## BaseTypeImpl.stringify() method

Create a JSON string of the given value, using the type information of the current type. Throws if the value is not serializable.

**Signature:**

```typescript
stringify(value: ResultType): string;
```

## Parameters

| Parameter | Type       | Description                                                            |
| --------- | ---------- | ---------------------------------------------------------------------- |
| value     | ResultType | a previously validated or constructed value, must conform to this type |

**Returns:**

string

## Remarks

Only use this method on values that have been validated or constructed by this type. It will use the available type information to efficiently create a stringified version of the value. Unknown (extra) properties of object types are stripped.

Note that this implementation differs from the specs of `JSON.stringify` in that it will throw on all values that are not serializable into JSON.
