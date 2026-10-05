import { jest } from '@jest/globals';

/** supabase-js 가 돌려주는 모양. data 와 error 중 하나만 채운다. */
export interface QueryResult {
  data: unknown;
  error: unknown;
}

/** 빌더가 흉내 내는 체인 메서드. 전부 자기 자신을 돌려준다. */
const CHAIN_METHODS = [
  'select',
  'insert',
  'delete',
  'eq',
  'is',
  'gt',
  'lt',
  'order',
] as const;

export type QueryBuilder = Record<string, jest.Mock> & {
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
};

/**
 * supabase-js 의 쿼리 빌더를 흉내 낸다. 모든 필터 메서드는 자기 자신을 돌려주고,
 * 끝에서 await 하거나 single/maybeSingle 을 부르면 준비된 결과를 준다.
 *
 * @param result 체인 끝에서 돌려줄 값
 * @returns 체인 가능한 가짜 빌더
 */
export function queryReturning(result: QueryResult): QueryBuilder {
  const builder = {} as QueryBuilder;
  for (const method of CHAIN_METHODS) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve) => Promise.resolve(result).then(resolve);
  return builder;
}
