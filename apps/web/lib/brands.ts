import { Icons } from '@rillroot/ui/components/icons';

/**
 * @property {string} key 브랜드 키. 채널 키와 같은 값을 쓴다
 * @property {string} label 표시 이름
 * @property {React.ComponentType<React.SVGProps<SVGSVGElement>>} Icon 로고
 * @property {string} fill 로고 색. globals.css 의 브랜드 색 변수를 가리킨다
 */
export interface Brand {
  key: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  fill: string;
}

/**
 * 외부 브랜드의 로고와 색. 브랜드 스택과 채널 칩이 같은 값을 쓴다.
 * 색 자체는 globals.css 의 :root 변수가 갖고 여기서는 변수 이름만 안다.
 */
export const BRANDS = {
  x: { key: 'x', label: 'X', Icon: Icons.brand.x, fill: 'var(--X-twitter)' },
  threads: {
    key: 'threads',
    label: 'Threads',
    Icon: Icons.brand.threads,
    fill: 'var(--threads)',
  },
  linkedin: {
    key: 'linkedin',
    label: 'LinkedIn',
    Icon: Icons.brand.linkedin,
    fill: 'var(--linkedin)',
  },
  bluesky: {
    key: 'bluesky',
    label: 'Bluesky',
    Icon: Icons.brand.bluesky,
    fill: 'var(--bluesky)',
  },
} as const satisfies Record<string, Brand>;

/**
 * 키로 브랜드를 찾는다. 로고가 없는 브랜드면 undefined 다.
 *
 * @param key 브랜드 키
 * @returns 브랜드 또는 undefined
 */
export function brandOf(key: string): Brand | undefined {
  return (BRANDS as Partial<Record<string, Brand>>)[key];
}
