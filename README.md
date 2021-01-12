# Runtime type-validation with auto-derived TypeScript types

Inspired by [io-ts](https://github.com/gcanti/io-ts), but without the functional programming (lingo).

-   [Design goals](#design-goals)
-   [API examples](#api-examples)
    -   ["Simple types"](#"simple-types")
    -   [Object types](#object-types)
    -   [Unions and Intersections](#unions-and-intersections)
    -   [Generic Types](#generic-types)
    -   [Parsers](#parsers)
-   [Nest.js integration](#nest.js-integration)
-   [API reference](markdown/types.md)

## Design goals:

### strict / loose mode

Every type is strict by default (applies no coercion during validation), but can be converted into a looser variant using the [`.autoCast`](markdown/types.basetypeimpl.autocast.md) feature. Also, objects are stripped of unknown properties by default.

### Great (human-)readable error messages

Great care has been taken to ensure that (even deeply nested) types emit readable error messages when validation fails.

### No FP API / No FP lingo

When integrating in an imperative codebase, using a library that is purely functional programming-oriented is not fun.

### Mimic JavaScript type-constructors

In JavaScript, one can create a `string` or `number` using the constructors `String` and `Number`. Types created with this library mimic that pattern as you can see in the [API examples](#api-examples) below.

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

Sometimes however, it would be really nice to have nominal types (i.e. types that are different just because they have a different name, even if they look the same). An example from this library is the [`int`](markdown/types.int.md) type. A value that is validated by this type is effectively a `number` that has been validated to be a whole number (an integer). `int`s should be assignable to variables of type `number`, because they are in fact numbers. But not the other way round; a `number` is not guaranteed to be an `int`.

TypeScript currently has limited support for nominal types, but we can work around this limitation with "branding". Without going into too much details, this allows us to do the following:

```typescript
// This is a built-in type, so you don't need to do this yourself, but it's a good
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
// one-liner that creates a TypeScript type with the same name. The following is
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
type uint = The<typeof uint>;
const uint = int.withConstraint('uint', n => n >= 0);

// Valid:
const a: number = uint(123);
const b: int = uint(123);
const c: uint = uint(123);

// Invalid (TypeScript will complain):
const a: uint = 123;
const b: uint = int(123);
```

Note that brands are string-literals, so make sure to use unique brand-names for your types. [io-ts](https://github.com/gcanti/io-ts) uses unique symbols, which have stronger uniqueness guarentees. In this library we opted to use string-literals to allow for a much easier to use API.

### Compatible with TypeScript's `emitDecoratorMetadata` feature

When using the `emitDecoratorMetadata` feature of the TypeScript compiler, the compiler will emit some runtime-accessible metadata about all declarations that have decorators. This metadata includes the actual classes that are used as types for parameters or return-types (see https://www.typescriptlang.org/docs/handbook/decorators.html for examples).

It enables libraries that perform automatic type-validation based on TypeScript typings of a method or constructor. This is done in several frameworks/libraries and can be very convenient. It is limited to classes however, because in TypeScript other types have no runtime aspect. When defining types using this library, types **do** have a runtime aspect. So this library enables the use of any type (even a regexp-validated string, an enum, etc.) as type in a decorated method and makes sure the right metadata is available at runtime for runtime validation. (see [this example of Nest.js integration](#nest.js-integration))

When using types in combination with the `emitDecoratorMetadata` feature, make sure to always create a TypeScript type with the same name as the runtime type-validator, as follows:

```typescript
type MyType = The<typeof MyType>;
const MyType = // MyType implementation here
```

## API examples

### "Simple types"

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

The error-message is ok, but to get better error messages provide one in your validation-function, for example:

```typescript
/** A Percentage must be between 0 and 100 inclusive. */
type Percentage = The<typeof Percentage>;
const Percentage = number.withConstraint('Percentage', n => (n >= 0 && n <= 100) || 'should be between 0 and 100 inclusive');

Percentage(123);
// throws ValidationError: error in [Percentage]: should be between 0 and 100 inclusive, got: 123
```

### Object types

This is nice and all, but the library really shines once you start combining types into larger structures.

```typescript
/** User is a basic object type. */
type User = The<typeof User>;
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
// throws ValidationError: errors in [User]:
//
// - missing property <name> [{ first: SmallString, last: string }], got: { shoeSize: -5 }
//
// - at <shoeSize>: reverse running-shoes are not supported yet, got: -5

User({ name: { first: "my name is so incredibly long, you wouldn't believe it" }, shoeSize: -4 });
// throws ValidationError: errors in [User]:
//
// - at <name>: missing property <last> [string], got: { first: "my name is so  .. n't believe it" }
//
// - at <shoeSize>: reverse running-shoes are not supported yet, got: -4
//
// - at <name.first>: expected a [SmallString], got: "my name is so incred ..  wouldn't believe it"

User({ name: { first: 'Donald', last: 'Duck' }, shoeSize: 1 }); // OK
```

Optional fields can be added with [`withOptional()`](markdown/types.interfacetype.withoptional.md).

```typescript
type Name = The<typeof Name>;
const Name = object('Name', {
    /** First name */
    first: string,
    /** Last name */
    last: string,
}).withOptional({
    /** Optional middle name */
    middle: string,
});

Name({ first: 1 });
// throws ValidationError: errors in [Name]:
//
// - missing property <last> [string], got: { first: 1 }
//
// - at <first>: expected a string, got a number (1)
```

Note that `Name` does not complain about a missing `middle` property (because that property is optional).

By default, `object` validators strip unknown properties. In a future version, this behavior will be configurable.

```typescript
Name({ first: 'first', last: 'last', middle: 'middle', title: 'title' });
// => { first: 'first', last: 'last', middle: 'middle' }
```

Note that, by default, `undefined` values and omitted fields are interchangeable:

```typescript
// `or` defines a simple union which is explained below
object({ prop: string.or(undefinedType) }).is({}); // => true
// `partial` is the same as `object`, but all properties are optional
partial({ prop: string }).is({ prop: undefined }); // => true

// This allows us to provide default values for omitted fields and define
// optional fields inline with required fields. (`withParser` will be explained
// later)

type StringOrEmpty = The<typeof StringOrEmpty>;
const StringOrEmpty = string.or(undefinedType).withParser(i => i || 'DEFAULT');

// Now missing properties are automatically converted to the given default value.
// In a future version we might add a convenience method for this.
object({ prop: StringOrEmpty }).construct({}); // => { prop: 'DEFAULT' }
object({ prop: StringOrEmpty }).is({}); // => true
```

To opt out of this behavior, use the optional options parameter (first):

```typescript
object({ strictMissingKeys: true }, { prop: StringOrEmpty }).construct({});
// throws ValidationError: error in [{ prop: string | undefined }]: missing property <prop> [string | undefined], got: {}
object({ strictMissingKeys: true }, { prop: StringOrEmpty }).construct({ prop: undefined });
// => { prop: 'DEFAULT' }
```

### Unions and Intersections

Use [`union()`](markdown/types.union.md) and [`intersection()`](markdown/types.intersection.md) to create unions and intersections. When creating unions or intersections of two types, the methods: [`or()`](markdown/types.basetypeimpl.or.md) and [`and()`](markdown/types.baseobjectliketypeimpl.and.md) might be preferable.

```typescript
// Example adapted from: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#unions-with-common-fields
type NetworkState = The<typeof NetworkState>;
const NetworkState = union('NetworkState', [
    object('NetworkLoadingState', { state: literal('loading') }),
    object('NetworkFailedState', { state: literal('failed'), code: number }),
    object('NetworkSuccessState', { state: literal('success'), response: Response }),
]);
```

When reporting errors, in case of unions, the library tries to be as helpful as possible. Of course all errors are grouped by union-element for better understandability:

```typescript
NetworkState({});
// throws ValidationError: error in [NetworkState]: failed every element in union:
// (got: {})
//   • error in [NetworkLoadingState]: missing property <state> ["loading"]
//   • errors in [NetworkFailedState]:
//     ‣ missing properties <state> ["failed"] and <code> [number]
//   • errors in [NetworkSuccessState]:
//     ‣ missing properties <state> ["success"] and <response> [Response]
```

But whenever possible, the validation-messages will be limited to the (most likely) intended union-element:

```typescript
NetworkState({ state: 'failed', code: '500' });
// throws ValidationError: error in [NetworkState]: in union element [NetworkFailedState] at <code>: expected a number, got a string ("500")
//   • disregarded 2 union-subtypes due to a mismatch in values of discriminator <state>

// Or based on the type of value:
union([string, boolean, object({ value: number, unit: string })]).check(123);
// throws ValidationError: error in [string | boolean | { value: number, unit: string }]: expected a boolean, an object or a string, got a number (123)

union([string, boolean, object({ value: number, unit: string })]).check({});
// throws ValidationError: error in [string | boolean | { value: number, unit: string }]:
//   • missing properties <value> [number] and <unit> [string], got: {}
//   • disregarded 2 union-subtypes that do not accept an object
```

### Generic Types

Generic types can be modelled as functions. This is best explained with an example.

To model the following type:

```typescript
interface MyGenericWrapper<T> {
    // Example of an ordinary interface member:
    ok: boolean;
    // This is the generic part:
    inner: T;
}
```

Create the following function:

```typescript
function MyGenericWrapper<T>(innerType: Type<T>) {
    // The name (first parameter) is of course optional, but it can make life easier when things get more complex.
    return object(`MyGenericWrapper<${innerType.name}>`, {
        ok: boolean,
        inner: innerType,
    });
}
```

An alias in TypeScript...

```typescript
type WrappedUser = MyGenericWrapper<User>;
```

... becomes a variable (with the necessary boilerplate) using this library:

```typescript
type WrappedUser = The<typeof WrappedUser>;
const WrappedUser = MyGenericWrapper(User);
```

But you can also use it inline inside other combinators.

```typescript
type UserRequest = The<typeof UserRequest>;
const UserRequest = object('UserRequest', {
    method: Method,
    url: Url,
    body: MyGenericWrapper(User),
});
```

### Parsers

Validation is most likely used to validate incoming data / messages. Sometimes this data looks a lot like your internal type, but is slightly off. For example, maybe, the input has strings instead of numbers, or a "yes"/"no" instead of booleans. In those cases you can "prepend" a parsing step to your validator. For builtin types the most common conversions are available using the [`.autoCast`](markdown/types.basetypeimpl.autocast.md) feature.

Take the following (questionable) definition of `Age`:

```typescript
type Age = The<typeof Age>;
const Age = int.withConstraint('Age', n => (n >= 0 && n < 200) || 'unexpected age');

Age(123); // => 123
Age('123');
// throw ValidationError: error in base type of [Age]: expected a number, got a string ("123")
```

When we turn on the `autoCast` feature, it will accept anything it can reasonably (and safely) convert to number:

```typescript
type Age = The<typeof Age>;
const Age = int.withConstraint('Age', n => (n >= 0 && n < 200) || 'unexpected age').autoCast;

Age(123); // => 123
Age('123'); // => 123
```

This is why we call the default function the "type constructor". It behaves similarly to `Number` and `String`. This is reflected in the API as follows:

```typescript
// Age(...) is shorthand for Age.construct(...), it uses the optional parser to
// (try to) construct a valid instance of Age.
Age.construct('123'); // => 123
Age(true);
// throws ValidationError: error in parser of [Age.autoCast]: could not autocast value: true

// `is()` is a type-guard, it returns whether the value is already a valid Age.
Age.is('123'); // => false
Age.is(123); // => true

// `check()` is the check-only variant of `construct()`, it returns the value, but
// does not involve the parser
Age.check('123'); // throws
Age.check(123); // => 123
```

You can use your own (custom) parser with the [`withParser()`](markdown/types.basetypeimpl.withparser.md). For example:

```typescript
type Answer = The<typeof Answer>;
const Answer = boolean.withParser(
    'Answer',
    string.andThen(v => v === 'yes'),
);

Answer('yes'); // => true
Answer('no'); // => false
Answer(1);
// throws ValidationError: error in parser precondition of [Answer]: expected a string, got a number (1)

// Or, as an contrived example, if you want to be more rigid:
type Answer = The<typeof Answer>;
const ValidAnswers = keyof({ yes: true, no: false });
const Answer = boolean.withParser('Answer', v => ValidAnswers.translate(v));

Answer('yes'); // => true
Answer('nope');
// throws ValidationError: error in parser of [Answer]: expected a ["yes" | "no"], got: "nope"
```

### Literals

It is quite common to construct (large) object literals in code or in unit tests. Since the type-constructors accepts
`unknown` as an argument, you run the risk of losing code completion. However, each type also has a
[`.literal`](markdown/types.basetypeimpl.literal.md) feature

```typescript
const NonEmptyString = string.withConstraint('NonEmptyString', s => !!s.length);
type User = The<typeof User>;
const User = object('User', {
    name: object({
        first: NonEmptyString,
        last: NonEmptyString,
    }),
    shoeSize: int,
});
const user = User({
    // this would not get code completion as the functions accepts `unknown` :-(
});
const fullUser: User = {
    // gets code completion, but requires you to type guard every literal :-(
    name: {
        first: NonEmptyString('John'),
        last: NonEmptyString('Doe'),
    },
    shoeSize: int(48),
};
const literalUser = User.literal({
    // code completion and no need for guarding simple literals :-)
    name: {
        first: 'John',
        last: 'Doe',
    },
    shoeSize: 48,
});
// constructing a simple object with the same code completion support using DeepUnbranded utility
const simpleUser: DeepUnbranded<User> = {
    name: {
        first: 'John',
        last: 'Doe',
    },
    shoeSize: 48,
};
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
