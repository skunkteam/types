<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [InterfaceMergeOptions](./types.interfacemergeoptions.md) &gt; [omitValidations](./types.interfacemergeoptions.omitvalidations.md)

## InterfaceMergeOptions.omitValidations property

When set, do not apply the custom validations from the base types onto the new merged type.

**Signature:**

```typescript
omitValidations?: true;
```

## Remarks

By default, custom validations (i.e. validations that are added to a type using [withValidation](./types.basetypeimpl.withvalidation.md) or [withConstraint](./types.basetypeimpl.withconstraint.md)<!-- -->) are reused when merging multiple interface types using [withOptional](./types.interfacetype.withoptional.md)<!-- -->, [withRequired](./types.interfacetype.withrequired.md) and [mergeWith](./types.interfacetype.mergewith.md)<!-- -->. Use this option to omit all custom validations in the resulting merged type.

Note that reuse of custom validations only works when no properties overlap between the types that are being merged. As long as the properties don't overlap we can be sure that the merged type is assignable to each of the original types (`A & B` is assignable to both `A` and `B`<!-- -->). Therefore, the validations are still safe to run, even though the type has been extended with additional properties.

When overlap is detected in the property-names of the types and any custom validation is encountered by Skunk Team types, an Error will be thrown. Use this option to ignore the custom validations and continue with the merge.

Alternatively, it is always possible to use an [intersection()](./types.intersection.md) instead.
