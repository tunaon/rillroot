import { randomInt } from 'node:crypto';

/** 다섯 자 이하의 중립·긍정 단어만 둔다. */
const ADJECTIVES = [
  'bold',
  'brave',
  'calm',
  'clear',
  'cool',
  'fair',
  'fine',
  'fresh',
  'glad',
  'keen',
  'kind',
  'light',
  'lucky',
  'merry',
  'neat',
  'nice',
  'proud',
  'quick',
  'quiet',
  'swift',
  'warm',
  'wise',
  'witty',
] as const;

const NOUNS = [
  'bird',
  'cloud',
  'comet',
  'dawn',
  'deer',
  'dune',
  'fern',
  'grove',
  'hill',
  'lake',
  'leaf',
  'lynx',
  'moon',
  'moss',
  'otter',
  'peak',
  'pine',
  'reed',
  'river',
  'sage',
  'star',
  'stone',
  'tide',
  'wave',
  'wind',
  'wolf',
  'wren',
] as const;

const BASE_DIGITS = 2;

/** 단어가 다섯 자씩이므로 네 자리까지만 붙여야 열네 자를 넘지 않는다. */
const MAX_DIGITS = 4;

/** 한 번의 충돌은 운이지만 연속 충돌은 공간이 찼다는 신호다. */
const COLLISIONS_PER_EXTRA_DIGIT = 3;

/** 연속으로 충돌할 때만 자릿수를 늘리고 상한에서 멈춘다. */
export function digitsForAttempt(attempt: number): number {
  return Math.min(
    BASE_DIGITS + Math.floor(attempt / COLLISIONS_PER_EXTRA_DIGIT),
    MAX_DIGITS
  );
}

/** 형용사와 명사를 이어 붙이고 숫자를 더한다. */
export function generateHandle(digits: number = BASE_DIGITS): string {
  const number = String(randomInt(10 ** digits)).padStart(digits, '0');

  return `${pick(ADJECTIVES)}${pick(NOUNS)}${number}`;
}

function pick(words: readonly string[]): string {
  return words[randomInt(words.length)] as string;
}
