# Runtime type-validation with auto-derived TypeScript types

Inspired by [io-ts](https://github.com/gcanti/io-ts), but without the functional programming (lingo).

-   [Design goals](#design-goals)
-   [API reference](markdown/types.md)
-   [Nest.js integration](#nest.js-integration)

## Design goals:

### strict / loose mode

Every type is strict by default (applies no coercion during validation), but can be converted into a looser variant using the [`.autoCast`](markdown/types.basetypeimpl.autocast.md) feature.

### Super (human-)readable error messages

Great care has been taken to ensure that (even deeply nested) types emit readable error messages when validation fails.

### No FP API / No FP lingo

When integrating in an imperative codebase, using a library that is purely functional programming-oriented is not fun.

### Mimic JavaScript type-constructors

In JavaScript, one can create a `string` or `number` using the constructors `String` and `Number`. Types created with this library mimic that pattern as you can see in the [examples](#api-examples) below.

### Branding

TypeScript uses structural typing (to match JavaScript's duck-typing). In short, this means that two interfaces or types that look the same are automatically compatible with each-other, even though they might have different names. This is of course very powerful, for example:

```typescript
interface SomeInterface {
    someProperty: string;
}
type SomeOtherInterface = SomeInterface & { partial?: 'property' };
const obj = { someProperty: 'with a value' };

// Now all three of: `SomeInterface`, `SomeOtherInterface` and `typeof obj` are assignable to each other, because they all satisfy each-other's requirements.
```

Sometimes however, it would be really nice to have nominal types (i.e. types that are different just because they have a different name, even if they look the same). An example from this library is the [`int`](markdown/types.int.md) type. A value that is validated by this type is effectively a `number` that has been validated to be a whole number (an integer). `int`s should be assignable to variables of type `number`, because they are in fact numbers. But not the otherway round; a `number` is not guaranteed to be an `int`.

TypeScript currently has limited support for nominal types, but we can work around this limitation with "branding". Without going into too much details, this allows us to do the following:

```typescript
// This is a built-in type, so you don't need to do this yourself, but is a good
// example of a branded type. The type `int` defined here is a subtype of number,
// checked by the `Number.isInteger` function and given the brand `int`.
const int = number.withConstraint('int', Number.isInteger);

// This means that all values that are succesfully validated by this type
// (first checked to be a number and then to satisfy `Number.isInteger`)
// receive the brand `int`. This is not a runtime thing, but purely a
// TypeScript design-time aspect of the resulting type.

const myValue = int(1234);

// At runtime the value is still a number (and TypeScript respects that), so
// we can do the following:
const myCalculatedResult = myValue * 2;
// And:
const veryVeryLongString = '*'.repeat(myValue);

// But TypeScript enforces that we don't accidentally assign or use other kind
// of numbers where we explicitly only accept integers. Take for example the
// following function:
function setPageNumber(page: The<typeof int>): void;

// Wait, what's that awkward type? `The<typeof int>` is not something we want to
// write every time, and definitely not something we want to expose to consumers
// of our APIs. This is why we always combine our type-declaration with a
// one-liner that/ creates a TypeScript type with the same name. The following is
// the actual declaration in this library:
export type int = The<typeof int>;
export const int = number.withConstraint('int', Number.isInteger);

// Now we can simply say:
function setPageNumber(page: int): void;

// This is valid usage of this function:
setPageNumber(myValue);

// But this isn't, because TypeScript knows we have not validated the given number,
// so this will fail design-time:
setPageNumber(1234);

// It is also possible to sub-type branded types. Example:
const uint = int.withConstraint('uint', n => n >= 0);
type uint = The<typeof uint>;

// Valid:
const a: number = uint(123);
const b: int = uint(123);
const c: uint = uint(123);

// Invalid:
const a: uint = 123;
const b: uint = int(123);
```

Note that brands are string-literals, so make sure to use unique brand-names for your types. [io-ts](https://github.com/gcanti/io-ts) uses unique symbols, which have stronger uniqueness guarentees. In this library we opted to use string-literals anyway to allow for a much easier to use API.

### Compatible with TypeScript's `emitDecoratorMetadata` feature

When using the `emitDecoratorMetadata` feature of the TypeScript compiler, the compiler will emit some runtime-accessible metadata about all declarations that have decorators. This metadata includes the actual classes that are used as types for parameters or return-types (see https://www.typescriptlang.org/docs/handbook/decorators.html for examples).

It enables libraries that perform automatic type-validation based on TypeScript typings of a method or constructor. This is done in several frameworks/libraries and can be very convenient. It is limited to classes however, because in TypeScript other types have no runtime aspect. When defining types using this library, types **do** have a runtime aspect. So This library enables the use of any type (even a regexp-validated string, an enum, etc.) as type in a decorated method and makes sure the right metadata is available at runtime for runtime validation. (see [this example of Nest.js integration](#nest.js-integration))

When using types in combination with the `emitDecoratorMetadata` feature, make sure to always create a TypeScript with the same name as the runtime type-validator, as follows:

```typescript
type MyType = The<typeof MyType>;
const MyType = // MyType implementation here
```

## API examples

```typescript
/** An example of a simple constraint without a custom message. */
const SmallString = string.withConstraint('SmallString', s => s.length < 10);
```

The TypeScript type can be accessed with `The<typeof SmallString>`, but that is not something we want to write every time, and definitely not something we want to expose to consumers of our APIs. This, and compatibility with decorator metadata, is why we always combine our type-declaration with a one-liner that creates a TypeScript type with the (exact) same name:

```typescript
/** An example of a simple constraint without a custom message. */
type SmallString = The<typeof SmallString>;
const SmallString = string.withConstraint('SmallString', s => s.length < 10);
```

To get a value of that type, simply call the type-constructor:

```typescript
const mySmallString = SmallString('123456789');
// mySmallString has (branded) type: SmallString, value: '123456789'

SmallString('1234567890');
// throws ValidationError: expected a [SmallString], got: "1234567890"
```

The error-message is ok, but to get better error messages provide one in your validation, for example:

```typescript
/** A Percentage must be between 0 and 100 inclusive. */
type Percentage = The<typeof Percentage>;
const Percentage = number.withConstraint('Percentage', n => (n >= 0 && n <= 100) || `should be between 0 and 100 inclusive, got: ${n}`);

Percentage(123);
// throws ValidationError: error in [Percentage]: should be between 0 and 100 inclusive, got: 123
```

This is nice and all, but the library really shines once you start combining types into larger structures.

```typescript
/** User is a basic interface type. */
const User = object('User', {
    /** The name of the User, split up into a first- and last-name. */
    name: object({
        /** The first name of the User, should not be longer than 9 characters. */
        first: SmallString,
        /** The last name, has no restrictions. */
        last: string,
    }),
    /** For reference, we need your shoe size, must be a whole non-negative number. */
    shoeSize: int.withValidation(n => n >= 0 || 'reverse running-shoes are not supported yet'),
});

User({ shoeSize: -5 });
// throws ValidationError: encountered multiple errors in [User]:
//
// - missing property <name> [{ first: SmallString, last: string }], got: { shoeSize: -5 }
//
// - at <shoeSize>: reverse running-shoes are not supported yet

User({ name: { first: "my name is so incredibly long, you wouldn't believe it" }, shoeSize: -4 });
// throws ValidationError: encountered multiple errors in [User]:
//
// - at <name>: missing property <last> [string], got: { first: "my name is so incr .. ouldn't believe it" }
//
// - at <shoeSize>: reverse running-shoes are not supported yet
//
// - at <name.first>: expected a [SmallString], got: "my name is so incred ..  wouldn't believe it"

User({ name: { first: 'Donald', last: 'Duck' }, shoeSize: 1 }); // OK
```

## Nest.js integration

One of the frameworks that provides features for runtime validation based on the TypeScript types of parameters is [Nest.js](https://nestjs.com/). The following is an example of integration with Nest.js using a generic type-validation pipe:

```typescript
import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { boolean, isType, reportError, string, Type } from '@skunkteam/types';

// This pipe performs runtime type-validation, you should register
// it globally, see Nest.js documentation for more details.
@Injectable()
export class TypeValidationPipe implements PipeTransform {
    transform(value: unknown, { metatype }: ArgumentMetadata) {
        if (!isType(metatype)) {
            // You may want to warn or error, instead of skipping
            // validation, that is up to you.
            return value;
        }

        const result = metatype.validate(value, { mode: 'construct' });
        if (result.ok) {
            return result.value;
        }
        throw new BadRequestException(reportError(result));
    }
}
```
