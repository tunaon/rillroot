import {
  getNames,
  isValid,
  registerLocale,
  toAlpha2,
} from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

registerLocale(enLocale);

export interface Country {
  /** ISO 3166-1 alpha-2 코드 */
  code: string;
  /** 영어 국가명 */
  name: string;
}

/**
 * @description 국가 코드를 대문자 두 글자 형식으로 맞춘다.
 * 세 글자 코드와 숫자 코드도 두 글자로 바꾼다.
 * 실재하지 않는 코드와 언어 코드는 통과시키지 않는다.
 */
export function toCountryCode(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const code = value.trim().toUpperCase();

  // toAlpha2는 두 글자 입력을 검사 없이 그대로 돌려준다. 그래서 실재하는 코드인지 먼저 본다.
  return isValid(code) ? (toAlpha2(code) ?? null) : null;
}

/**
 * @description 언어 코드에서 그 언어가 가장 많이 쓰이는 국가 코드를 얻는다.
 * 실제 접속 국가가 아니라 언어로 추측한 값이다.
 */
export function localeToCountryCode(
  locale: string | null | undefined
): string | null {
  if (!locale) {
    return null;
  }

  try {
    // 표준 자료로 언어에 빠진 지역을 채운다. en은 US, ko는 KR, ja는 JP가 된다.
    return toCountryCode(new Intl.Locale(locale).maximize().region);
  } catch {
    // 언어 태그 형식이 아니면 예외가 난다.
    return null;
  }
}

/** @description 전체 국가를 코드와 영어 이름으로 얻는다. 이름 순으로 정렬한다. */
export function getCountries(): Country[] {
  return Object.entries(getNames('en', { select: 'official' }))
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
