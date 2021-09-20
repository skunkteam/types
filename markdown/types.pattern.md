<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@skunkteam/types](./types.md) &gt; [pattern](./types.pattern.md)

## pattern() function

<b>Signature:</b>

```typescript
export declare function pattern<BrandName extends string>(
    name: BrandName,
    regExp: RegExp,
    customMessage?: StringTypeConfig['customMessage'],
): Type<Branded<string, BrandName>, StringTypeConfig>;
```

## Parameters

| Parameter     | Type                                                                       | Description |
| ------------- | -------------------------------------------------------------------------- | ----------- |
| name          | BrandName                                                                  |             |
| regExp        | RegExp                                                                     |             |
| customMessage | [StringTypeConfig](./types.stringtypeconfig.md)<!-- -->\['customMessage'\] |             |

<b>Returns:</b>

[Type](./types.type.md)<!-- -->&lt;[Branded](./types.branded.md)<!-- -->&lt;string, BrandName&gt;, [StringTypeConfig](./types.stringtypeconfig.md)<!-- -->&gt;