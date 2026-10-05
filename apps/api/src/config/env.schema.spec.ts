import 'reflect-metadata';

import { describe, expect, it } from '@jest/globals';
import { validateEnv } from './env.schema';

const VALID = {
  PORT: '4000',
  CORS_ORIGIN: 'http://localhost:3000',
  API_PUBLIC_URL: 'http://127.0.0.1:4000/',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SECRET_KEY: 'secret',
  DATABASE_URL: 'postgres://localhost/db',
  GOOGLE_SECRET_KEY: 'google',
  RESEND_API_KEY: 'resend',
};

describe('validateEnv', () => {
  it('문자열 포트를 숫자로 바꾸고 로컬 주소를 허용한다', () => {
    const env = validateEnv(VALID);

    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('선언하지 않은 변수는 버린다', () => {
    const env = validateEnv({ ...VALID, UNRELATED: 'x' });

    expect(env).not.toHaveProperty('UNRELATED');
  });

  it('값이 빠지면 그 이름을 담아 던진다', () => {
    const { RESEND_API_KEY: _, ...missing } = VALID;

    expect(() => validateEnv(missing)).toThrow(/RESEND_API_KEY/);
  });

  it('포트가 숫자가 아니면 던진다', () => {
    expect(() => validateEnv({ ...VALID, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('공개 주소의 끝 슬래시를 지운다', () => {
    expect(validateEnv(VALID).API_PUBLIC_URL).toBe('http://127.0.0.1:4000');
  });

  it('공개 주소가 https 일 때만 Bluesky 서명 키를 요구한다', () => {
    expect(() => validateEnv(VALID)).not.toThrow();
    expect(() =>
      validateEnv({ ...VALID, API_PUBLIC_URL: 'https://api.example.com' })
    ).toThrow(/BLUESKY_OAUTH_PRIVATE_KEY/);
  });
});
