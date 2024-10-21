import { BaseTypeImpl, createType } from './base-type';
import { autoCastFailure } from './symbols';
import { bracketsIfNeeded, printValue } from './utils';

/**
 * Returns the same type, but with an auto-casting default parser installed.
 *
 * @remarks
 * Each type implementation provides its own auto-cast rules. See builtin types for examples of auto-cast rules.
 */
export function autoCast<T extends BaseTypeImpl<unknown>>(type: T): T {
    const autoCaster = type['autoCaster'];
    const typeParser = type['typeParser'];
    if (!autoCaster || typeParser) return type;
    return (type['_instanceCache'].autoCast ??= createType(type, {
        name: { configurable: true, value: `AutoCast<${bracketsIfNeeded(type.name, '&', '|')}>` },
        typeParser: { configurable: true, value: createAutoCastParser(autoCaster) },
    })) as T;
}

/**
 * Create a recursive autocasting version of the given type.
 *
 * @remarks
 * This will replace any parser in the nested structure with the appropriate autocaster when applicable.
 */
export function autoCastAll<T extends BaseTypeImpl<unknown>>(type: T): T {
    return (type['_instanceCache'].autoCastAll ??= type['createAutoCastAllType']()) as T;
}

function createAutoCastParser<ResultType, TypeConfig>(
    autoCaster: (this: BaseTypeImpl<ResultType, TypeConfig>, value: unknown) => unknown,
): BaseTypeImpl<ResultType, TypeConfig>['typeParser'] {
    return function (this: BaseTypeImpl<ResultType, TypeConfig>, input) {
        const autoCastResult = autoCaster.call(this, input);
        return this.createResult(
            input,
            autoCastResult,
            autoCastResult !== autoCastFailure || {
                kind: 'custom message',
                message: `could not autocast value: ${printValue(input)}`,
                omitInput: true,
            },
        );
    };
}
