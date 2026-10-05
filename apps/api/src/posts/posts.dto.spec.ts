// 데코레이터가 클래스 정의 시점에 메타데이터 API를 쓴다. 앱에서는 Nest 가 로드하지만
// 이 스펙은 DTO 만 직접 검증하므로 여기서 가져온다.
import 'reflect-metadata';

import { describe, expect, it } from '@jest/globals';
import { MAX_POST_SEGMENTS, MAX_TITLE_LENGTH } from '@rillroot/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePostDto, UpdatePostDto } from './posts.dto';

async function failingProperties(dto: object): Promise<string[]> {
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

function createDto(overrides: Record<string, unknown> = {}) {
  return plainToInstance(CreatePostDto, {
    segments: ['첫 조각'],
    publish: false,
    ...overrides,
  });
}

function updateDto(overrides: Record<string, unknown> = {}) {
  return plainToInstance(UpdatePostDto, {
    segments: [{ body: '첫 조각' }],
    publish: false,
    ...overrides,
  });
}

describe('CreatePostDto', () => {
  it('조각 하나와 발행 여부만 있으면 통과한다', async () => {
    expect(await failingProperties(createDto())).toEqual([]);
  });

  it('조각이 없으면 거부한다', async () => {
    expect(await failingProperties(createDto({ segments: [] }))).toContain(
      'segments'
    );
  });

  it('조각 상한을 넘으면 거부한다', async () => {
    const segments = Array.from({ length: MAX_POST_SEGMENTS + 1 }, () => '글');
    expect(await failingProperties(createDto({ segments }))).toContain(
      'segments'
    );
  });

  it('발행이면 공백뿐인 조각을 거부하고 초안이면 허용한다', async () => {
    const segments = ['본문', '   '];

    expect(
      await failingProperties(createDto({ segments, publish: true }))
    ).toContain('segments');
    expect(
      await failingProperties(createDto({ segments, publish: false }))
    ).toEqual([]);
  });

  it('언어는 BCP 47 모양만 받는다', async () => {
    expect(await failingProperties(createDto({ language: 'ko' }))).toEqual([]);
    expect(await failingProperties(createDto({ language: 'es-MX' }))).toEqual(
      []
    );
    expect(await failingProperties(createDto({ language: 'KO' }))).toContain(
      'language'
    );
    expect(
      await failingProperties(createDto({ language: 'korean' }))
    ).toContain('language');
  });

  it('제목은 비어 있거나 상한을 넘으면 거부한다', async () => {
    expect(await failingProperties(createDto({ title: '' }))).toContain(
      'title'
    );
    expect(
      await failingProperties(
        createDto({ title: 'a'.repeat(MAX_TITLE_LENGTH + 1) })
      )
    ).toContain('title');
    expect(
      await failingProperties(
        createDto({ title: 'a'.repeat(MAX_TITLE_LENGTH) })
      )
    ).toEqual([]);
  });

  it('발행 여부가 불리언이 아니면 거부한다', async () => {
    expect(await failingProperties(createDto({ publish: 'yes' }))).toContain(
      'publish'
    );
  });
});

describe('UpdatePostDto', () => {
  it('식별자가 있는 조각과 없는 조각을 섞어 받는다', async () => {
    const dto = updateDto({
      segments: [
        { id: '4e1f9b1c-4d0a-4f4e-9c1e-9a2b2f1c7d11', body: '기존' },
        { body: '새 조각' },
      ],
    });

    expect(await failingProperties(dto)).toEqual([]);
  });

  it('식별자가 uuid 가 아니면 거부한다', async () => {
    const dto = updateDto({ segments: [{ id: 'not-a-uuid', body: '기존' }] });
    expect(await failingProperties(dto)).toContain('segments');
  });

  it('발행이면 공백뿐인 조각을 거부한다', async () => {
    const dto = updateDto({
      segments: [{ body: '본문' }, { body: ' ' }],
      publish: true,
    });

    expect(await failingProperties(dto)).toContain('segments');
  });
});
