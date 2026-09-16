import { cn } from '@rillroot/ui/lib/utils';

interface Props {
  /** 프로필 id(UUID). 무늬와 색의 씨앗값이다. */
  id: string;
  className?: string;
}

const GRID = 5;
/** 좌우 대칭이므로 가운데 열까지만 정하고 나머지는 거울처럼 복사한다. */
const HALF = Math.ceil(GRID / 2);
/** 격자 모서리가 원 밖으로 잘리지 않도록 두는 바깥 여백. */
const PADDING = 1.5;
const SIZE = GRID + PADDING * 2;

/** UUID에서 버전과 변형을 나타내는 자리. 값이 고정되어 있어 씨앗값에서 뺀다. */
const FIXED_DIGITS = new Set([12, 16]);

/**
 * 프로필 id로 그리는 5×5 좌우 대칭 아이덴티콘. 같은 id는 언제나 같은 무늬와 색이 된다.
 *
 * id는 무작위로 만들어진 UUID라 16진수 각 자리가 이미 고르게 흩어져 있으므로,
 * 해시를 거치지 않고 자리 값을 그대로 칸의 채움 여부와 색상에 쓴다.
 */
export default function ProfileAvatar({ id, className }: Props) {
  const digits = [...id.replaceAll('-', '')]
    .filter((_, index) => !FIXED_DIGITS.has(index))
    .map((char) => parseInt(char, 16));

  const cells: string[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < HALF; col++) {
      if (digits[row * HALF + col]! % 2 === 0) continue;

      const mirror = GRID - 1 - col;
      for (const x of col === mirror ? [col] : [col, mirror]) {
        cells.push(`M${PADDING + x} ${PADDING + row}h1v1h-1z`);
      }
    }
  }

  // 칸에 쓰지 않은 다음 세 자리로 색상 각도를 정한다.
  const offset = GRID * HALF;
  const hue =
    ((digits[offset]! * 256 + digits[offset + 1]! * 16 + digits[offset + 2]!) /
      4096) *
    360;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={SIZE / 2}
        fill={`oklch(0.94 0.03 ${hue})`}
      />
      {/* 칸을 한 path로 합쳐야 맞닿은 칸 사이에 안티앨리어싱 틈이 생기지 않는다. */}
      <path d={cells.join('')} fill={`oklch(0.62 0.12 ${hue})`} />
    </svg>
  );
}
