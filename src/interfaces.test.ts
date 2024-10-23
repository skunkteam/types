import { expectTypeOf } from 'expect-type';
import { DeepUnbranded, Unbranded, WithBrands } from './interfaces';

test('DeepUnbranded', () => {
    type BrandedString = WithBrands<string, 'BrandedString'>;
    expectTypeOf<DeepUnbranded<BrandedString>>().toEqualTypeOf<string>();

    type BrandedObject = WithBrands<{ string: BrandedString }, 'BrandedObject'>;
    expectTypeOf<Unbranded<BrandedObject>>().toEqualTypeOf<{ string: BrandedString }>();
    expectTypeOf<Unbranded<BrandedObject>>().not.toEqualTypeOf<{ string: string }>();
    expectTypeOf<DeepUnbranded<BrandedObject>>().toEqualTypeOf<{ string: string }>();

    type BrandedArray = WithBrands<BrandedObject[], 'BrandedArray'>;
    expectTypeOf<Unbranded<BrandedArray>>().toEqualTypeOf<BrandedObject[]>();
    expectTypeOf<DeepUnbranded<BrandedArray>>().toEqualTypeOf<Array<{ string: string }>>();

    type BrandedReadonlyArray = WithBrands<readonly BrandedObject[], 'BrandedReadonlyArray'>;
    expectTypeOf<Unbranded<BrandedReadonlyArray>>().toEqualTypeOf<readonly BrandedObject[]>();
    expectTypeOf<DeepUnbranded<BrandedReadonlyArray>>().toEqualTypeOf<ReadonlyArray<{ string: string }>>();

    type BrandedEmptyTuple = WithBrands<[], 'BrandedEmptyTuple'>;
    expectTypeOf<Unbranded<BrandedEmptyTuple>>().toEqualTypeOf<[]>();
    expectTypeOf<DeepUnbranded<BrandedEmptyTuple>>().toEqualTypeOf<[]>();

    type BrandedTuple = WithBrands<readonly [BrandedObject, BrandedObject, BrandedObject], 'BrandedTuple'>;
    expectTypeOf<Unbranded<BrandedTuple>>().toEqualTypeOf<readonly [BrandedObject, BrandedObject, BrandedObject]>();
    expectTypeOf<DeepUnbranded<BrandedTuple>>().toHaveProperty('length').toEqualTypeOf<3>();
    // This is the best we can do for now: (note the `toMatchTypeOf` instead of the `toEqualTypeOf`)
    expectTypeOf<DeepUnbranded<BrandedTuple>>().toMatchTypeOf<readonly [{ string: string }, { string: string }, { string: string }]>();

    // It should be enough for most cases:
    [{ string: 'abc' }, { string: 'abc' }, { string: 'abc' }] satisfies DeepUnbranded<BrandedTuple>;
});
