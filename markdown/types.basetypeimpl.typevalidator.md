<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [BaseTypeImpl](./types.basetypeimpl.md) &gt; [typeValidator](./types.basetypeimpl.typevalidator.md)

## BaseTypeImpl.typeValidator() method

The actual validation-logic.

**Signature:**

```typescript
protected abstract typeValidator(input: unknown, options: ValidationOptions): Result<ResultType>;
```

## Parameters

| Parameter | Type                                              | Description                     |
| --------- | ------------------------------------------------- | ------------------------------- |
| input     | unknown                                           | the input value to be validated |
| options   | [ValidationOptions](./types.validationoptions.md) | the current validation context  |

**Returns:**

[Result](./types.result.md)<!-- -->&lt;ResultType&gt;