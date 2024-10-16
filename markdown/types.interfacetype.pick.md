<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [InterfaceType](./types.interfacetype.md) &gt; [pick](./types.interfacetype.pick.md)

## InterfaceType.pick() method

Create a new type that consists only of the mentioned properties similar to the builtin `Pick` type.

**Signature:**

```typescript
pick<const Key extends keyof Props & keyof ResultType & string>(...args: [keys: OneOrMore<Key>] | [name: string, keys: OneOrMore<Key>] | [options: InterfacePickOptions, keys: OneOrMore<Key>]): PickType<Props, ResultType, Key>;
```

## Parameters

| Parameter | Type                                                                                                                                                                                                                                                                                       | Description |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| args      | \[keys: [OneOrMore](./types.oneormore.md)<!-- -->&lt;Key&gt;\] \| \[name: string, keys: [OneOrMore](./types.oneormore.md)<!-- -->&lt;Key&gt;\] \| \[options: [InterfacePickOptions](./types.interfacepickoptions.md)<!-- -->, keys: [OneOrMore](./types.oneormore.md)<!-- -->&lt;Key&gt;\] |             |

**Returns:**

[PickType](./types.picktype.md)<!-- -->&lt;Props, ResultType, Key&gt;
