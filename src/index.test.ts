import { describe, it, expect } from 'vitest';
import { add, greet } from './index.ts';

describe('add', () => {
  it('returns the sum of two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('returns zero when both inputs are zero', () => {
    expect(add(0, 0)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(add(-5, 3)).toBe(-2);
  });
});

describe('greet', () => {
  it('returns a greeting with the given name', () => {
    expect(greet('Alice')).toBe('Hello, Alice!');
  });
});
