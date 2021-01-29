<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [validate](./types.basetypeimpl.validate.md)

## BaseTypeImpl.validate() method

Validates that a value conforms to this type, and returns a result indicating success or failure (does not throw).

<b>Signature:</b>

```typescript
validate(input: unknown, options?: ValidationOptions): Result<ResultType>;
```

## Parameters

| Parameter | Type                                              | Description                     |
| --------- | ------------------------------------------------- | ------------------------------- |
| input     | unknown                                           | the input value to be validated |
| options   | [ValidationOptions](./types.validationoptions.md) | the current validation context  |

<b>Returns:</b>

[Result](./types.result.md)<!-- -->&lt;ResultType&gt;

## Remarks

If the given [ValidationOptions.mode](./types.validationoptions.mode.md) is `'construct'` (default) it also calls the parser to pre-process the given input.