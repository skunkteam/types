<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [PropertiesInfo](./types.propertiesinfo.md)

## PropertiesInfo type

Properties of an object type, including per-property optionality.

**Signature:**

```typescript
type PropertiesInfo<Props extends Properties = Properties> = {
    [Key in keyof Props]: PropertyInfo<Props[Key]>;
};
```

**References:** [Properties](./types.properties.md)<!-- -->, [PropertyInfo](./types.propertyinfo.md)
