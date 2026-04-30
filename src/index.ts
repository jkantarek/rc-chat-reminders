/**
 * @example
 * ```ts @import.meta.vitest
 * expect(add(1, 2)).toBe(3);
 * expect(add(0, 0)).toBe(0);
 * expect(add(-1, 1)).toBe(0);
 * ```
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(greet('World')).toBe('Hello, World!');
 * expect(greet('TypeScript')).toBe('Hello, TypeScript!');
 * ```
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
