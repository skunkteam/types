import { int, number, string } from './types';

test('autoCast should not override existing parsers', () => {
    const HourOfDay = int.withConstraint('HourOfDay', n => 0 <= n && n < 24).withParser(number.andThen(n => n % 24));

    const hour = HourOfDay(34);
    const afterAutoCast = HourOfDay.autoCast(34);

    expect(hour).toBe(10);
    expect(afterAutoCast).toBe(10);

    // Currently, types with parsers get no benefit from autoCast, because we don't know whether to apply the autoCast before or after the
    // custom parser.
    expect(() => HourOfDay('34')).toThrow('error in parser precondition of [HourOfDay]: expected a number, got a string ("34")');
    expect(() => HourOfDay.autoCast('34')).toThrow('error in parser precondition of [HourOfDay]: expected a number, got a string ("34")');
});

test('autoCast instances should not leak', () => {
    const SmallString = string.withConstraint('SmallString', s => s.length < 10);
    expect(string.autoCast).not.toBe(SmallString.autoCast);
});
