export function define<Constructor extends new (...args: any) => any, const Key extends string>(
    constructor: Constructor,
    key: Key,
    value: InstanceType<Constructor>[Key],
): void {
    Object.defineProperty(constructor.prototype, key, { configurable: true, value });
}
