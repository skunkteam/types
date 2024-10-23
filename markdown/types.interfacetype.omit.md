<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [InterfaceType](./types.interfacetype.md) &gt; [omit](./types.interfacetype.omit.md)

## InterfaceType.omit() method

Create a new type that consists of all properties of the base type, except those mentioned, similar to the builtin `Omit` type.

**Signature:**

```typescript
omit<const Key extends keyof Props & keyof ResultType & string>(...args: [keys: OneOrMore<Key>] | [name: string, keys: OneOrMore<Key>] | [options: InterfacePickOptions, keys: OneOrMore<Key>]): PickType<Props, ResultType, Exclude<keyof Props & keyof ResultType & string, Key>>;
```

## Parameters

| Parameter | Type                                                                                                                                                                                                                                                                                       | Description |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| args      | \[keys: [OneOrMore](./types.oneormore.md)<!-- -->&lt;Key&gt;\] \| \[name: string, keys: [OneOrMore](./types.oneormore.md)<!-- -->&lt;Key&gt;\] \| \[options: [InterfacePickOptions](./types.interfacepickoptions.md)<!-- -->, keys: [OneOrMore](./types.oneormore.md)<!-- -->&lt;Key&gt;\] |             |

**Returns:**

[PickType](./types.picktype.md)<!-- -->&lt;Props, ResultType, Exclude&lt;keyof Props &amp; keyof ResultType &amp; string, Key&gt;&gt;