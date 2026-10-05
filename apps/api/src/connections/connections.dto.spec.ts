import 'reflect-metadata';

import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AuthorizeConnectionDto,
  CompleteConnectionDto,
} from './connections.dto';

const failing = async (input: unknown) => {
  const errors = await validate(plainToInstance(CompleteConnectionDto, input));
  return errors.map((error) => error.property);
};

describe('AuthorizeConnectionDto', () => {
  const failingAuthorize = async (input: unknown) => {
    const errors = await validate(
      plainToInstance(AuthorizeConnectionDto, input)
    );
    return errors.map((error) => error.property);
  };

  it('돌아갈 경로가 없거나 내부 경로면 통과한다', async () => {
    expect(await failingAuthorize({})).toEqual([]);
    expect(await failingAuthorize({ return_to: '/ko' })).toEqual([]);
    expect(
      await failingAuthorize({ return_to: '/ko/posts?tab=drafts' })
    ).toEqual([]);
  });

  it('외부 주소나 다른 호스트로 해석될 수 있는 경로는 거부한다', async () => {
    for (const return_to of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'ko',
    ]) {
      expect(await failingAuthorize({ return_to })).toEqual(['return_to']);
    }
  });
});

describe('CompleteConnectionDto', () => {
  it('state 와 code 만 있어도 통과한다', async () => {
    expect(
      await failing({ state: 'abc', code: 'xyz', iss: 'https://bsky.social' })
    ).toEqual([]);
  });

  it('창작자가 거부한 응답도 통과한다', async () => {
    expect(
      await failing({
        state: 'abc',
        error: 'access_denied',
        error_description: 'denied',
      })
    ).toEqual([]);
  });

  it('state 가 없거나 비어 있으면 거부한다', async () => {
    expect(await failing({ code: 'xyz' })).toEqual(['state']);
    expect(await failing({ state: '', code: 'xyz' })).toEqual(['state']);
  });

  it('문자열이 아닌 값은 거부한다', async () => {
    expect(await failing({ state: 'abc', code: 123 })).toEqual(['code']);
  });
});
