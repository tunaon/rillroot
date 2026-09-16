import { describe, expect, it } from '@jest/globals';
import { digitsForAttempt, generateHandle } from './handle';

const HANDLE_PATTERN = /^[a-z0-9_]{3,15}$/;
const MAX_LENGTH = 14;
const ATTEMPTS = 9;

describe('handle', () => {
  it('저장 규칙을 만족하는 값을 만든다', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateHandle()).toMatch(HANDLE_PATTERN);
    }
  });

  it('연속 충돌마다 자릿수를 늘린다', () => {
    expect(digitsForAttempt(0)).toBe(2);
    expect(digitsForAttempt(2)).toBe(2);
    expect(digitsForAttempt(3)).toBe(3);
    expect(digitsForAttempt(5)).toBe(3);
    expect(digitsForAttempt(6)).toBe(4);
  });

  it('상한을 넘겨 늘리지 않는다', () => {
    expect(digitsForAttempt(8)).toBe(4);
    expect(digitsForAttempt(100)).toBe(4);
  });

  it('자릿수를 늘려도 길이 상한을 넘지 않는다', () => {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const handle = generateHandle(digitsForAttempt(attempt));

      expect(handle).toMatch(HANDLE_PATTERN);
      expect(handle.length).toBeLessThanOrEqual(MAX_LENGTH);
    }
  });
});
