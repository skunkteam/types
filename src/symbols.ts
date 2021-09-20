/**
 * Returned by an autocaster to indicate that it is not able to auto-cast the given input.
 */
export const autoCastFailure = Symbol('autoCastFailure');

/**
 * The symbol that gives access to the (design-time-only) brands of a Type.
 */
export const brands = Symbol('brands');

/**
 * The symbol that gives access to the (design-time-only) associated TypeScript type of a Type.
 */
export const designType = Symbol('designType');
