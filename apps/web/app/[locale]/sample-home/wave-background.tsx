'use client';

import { cn } from '@rillroot/ui/lib/utils';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

// 화면 전체를 덮는 삼각형 하나. 사각형(삼각형 두 개)보다 정점이 적고 대각선 이음매가 없다.
const VERTEX = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// 대각선으로 흐르는 물결 띠 하나와 흐린 색 덩어리 둘. 띠는 한쪽 가장자리만 선명하고
// 반대쪽으로 번진다. 출력은 premultiplied alpha 라 투명한 곳에는 뒤의 배경색이 비친다.
const FRAGMENT = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_brand;
// 브랜드 색과 번갈아 흐르는 둘째 색. --wave-accent 토큰에서 읽는다.
uniform vec3 u_accent;
// 물결이 흐르는 방향(라디안). 0 이면 가로로 눕는다.
uniform float u_angle;
// 무늬의 잘기. 값이 클수록 같은 상자 안에 물결이 더 여러 번 지나간다.
uniform float u_scale;
// 색의 농도. 1 이면 기본, 크면 물결이 짙어진다.
uniform float u_gain;

const float PI = 3.14159265;
// 넘실대는 주기(초)와 그중 크게 움직이는 구간의 비율
const float SURGE_PERIOD = 6.0;
const float SURGE_SHARE = 0.35;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 앞에 칠한 색 위에 반투명 색을 덮는다(premultiplied over).
vec4 over(vec4 dst, vec3 color, float alpha) {
  return vec4(color * alpha, alpha) + dst * (1.0 - alpha);
}

void main() {
  // 긴 변을 기준으로 두어, 좁은 기둥이든 납작한 바든 물결이 긴 방향을 따라 꽉 찬다.
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / max(u_resolution.x, u_resolution.y) * u_scale;
  float t = u_time;

  // 느리게 흐르다가 주기마다 한 번 앞으로 크게 밀려난다. 위상은 줄지 않아 되감기지 않는다.
  float cycle = t / SURGE_PERIOD;
  float surgeT = clamp(fract(cycle) / SURGE_SHARE, 0.0, 1.0);
  float phase = t * 0.08 + 0.9 * (floor(cycle) + smoothstep(0.0, 1.0, surgeT));
  float swell = 1.0 + 0.35 * sin(PI * surgeT);

  // 띠를 따라가는 축. p.x 는 띠를 따라, p.y 는 띠를 가로지른다.
  float angle = u_angle;
  vec2 p = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * uv;

  float center = swell * (
    0.32 * sin(p.x * 1.5 + phase * 2.6) +
    0.14 * sin(p.x * 3.2 - phase * 1.7)
  ) + 0.25 * (noise(vec2(p.x * 0.7, phase * 0.8)) - 0.5);
  float d = p.y - center;

  // 선명한 가장자리 위쪽으로 띠 면이 번져 나가고, 아래쪽에는 옅은 뒷면 빛이 깔린다.
  // 두 색이 맞닿는 경계는 폭을 넓혀, 부딪히지 않고 스며들듯 이어지게 한다.
  float edge = smoothstep(-0.05, 0.03, d);
  float face = edge * (0.55 * exp(-max(d, 0.0) * 4.0) + 0.2 * exp(-max(d, 0.0) * 1.5));
  float back = (1.0 - edge) * exp(d * 4.5) * 0.35;

  // 띠를 따라 브랜드 색과 둘째 색이 번갈아 흐른다.
  // 두 색을 고르게 섞으면 중간이 탁해지므로, 전환 구간을 좁혀 어느 한쪽 색에 머물게 한다.
  float tone = smoothstep(0.3, 0.7, 0.5 + 0.5 * sin(p.x * 1.1 - phase * 1.8 + noise(uv * 1.4 + phase) * 2.2));
  vec3 surface = mix(u_brand, u_accent, tone);
  // 접힌 가장자리에는 조금 짙은 둘째 색 선을 둬 면이 접힌 깊이를 만든다.
  vec3 faceColor = mix(u_accent * 0.9, surface, smoothstep(-0.02, 0.18, d));
  vec3 backColor = mix(u_accent, u_brand, tone);

  vec2 b1 = vec2(0.35 * sin(t * 0.13), 0.55 * cos(t * 0.11));
  vec2 b2 = vec2(-0.3 * cos(t * 0.09 + 1.0), -0.5 * sin(t * 0.12 + 2.0));
  float blob1 = exp(-dot(uv - b1, uv - b1) * 3.5) * 0.35;
  float blob2 = exp(-dot(uv - b2, uv - b2) * 4.5) * 0.3;

  vec4 color = vec4(0.0);
  color = over(color, u_brand, min(blob1 * u_gain, 1.0));
  color = over(color, u_accent, min(blob2 * u_gain, 1.0));
  color = over(color, backColor, min(back * u_gain, 1.0));
  color = over(color, faceColor, min(face * u_gain, 1.0));

  gl_FragColor = color;
}
`;

// 배경이라 선명도보다 GPU 부담을 우선한다.
const MAX_PIXEL_RATIO = 1.5;
// 모션을 줄인 사용자에게 보여줄 정지 화면의 시각
const STILL_TIME = 8;

// 왼쪽 아래에서 오른쪽 위로 향하는 기본 축
const DEFAULT_ANGLE = 0.85;
// 사이드바처럼 세로로 긴 상자를 한 번의 물결이 가로지르는 값
const DEFAULT_SCALE = 3;

/**
 * 부모를 꽉 채우는 물결 배경. 투명 캔버스에 그리므로 부모의 배경색이 테마를 따라가고,
 * 물결의 브랜드 색은 --brand 토큰에서 읽는다.
 */
export default function WaveBackground({
  angle = DEFAULT_ANGLE,
  scale = DEFAULT_SCALE,
  gain = 1,
  className,
}: {
  /** 물결이 흐르는 방향(라디안). 0 이면 가로. */
  angle?: number;
  /** 무늬의 잘기. 납작한 띠에는 큰 값을 줘야 무늬가 잘린 것처럼 보이지 않는다. */
  scale?: number;
  /** 색의 농도. 1 이 기본이고, 마스크로 옅어지는 자리를 보완할 때 올린다. */
  gain?: number;
  /** 감싸는 상자의 배치. 생략하면 부모를 꽉 채운다. */
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!canvas || !gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uBrand = gl.getUniformLocation(program, 'u_brand');
    const uAccent = gl.getUniformLocation(program, 'u_accent');
    gl.uniform1f(gl.getUniformLocation(program, 'u_angle'), angle);
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), scale);
    gl.uniform1f(gl.getUniformLocation(program, 'u_gain'), gain);

    const start = performance.now();
    let frame = 0;

    const draw = (time: number) => {
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = () => {
      draw((performance.now() - start) / 1000);
      frame = requestAnimationFrame(tick);
    };

    const play = () => {
      cancelAnimationFrame(frame);
      if (reduced) {
        draw(STILL_TIME);
      } else if (!document.hidden) {
        frame = requestAnimationFrame(tick);
      }
    };

    // 셰이더는 oklch 를 해석하지 못하므로, 2D 캔버스에 토큰 색을 칠해 sRGB 값으로 바꿔 읽는다.
    const probe = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true });
    const readToken = (name: string, location: WebGLUniformLocation | null) => {
      if (!probe) return;
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
      gl.uniform3f(location, r / 255, g / 255, b / 255);
    };
    const readColors = () => {
      readToken('--brand', uBrand);
      readToken('--wave-accent', uAccent);
    };

    readColors();

    // 크기를 바꾸면 캔버스가 지워지므로 정지 화면은 다시 그린다.
    const resize = new ResizeObserver(() => {
      const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      if (reduced) draw(STILL_TIME);
    });
    resize.observe(canvas);

    // 테마를 바꾸면 <html> class 가 바뀌고 색 토큰 값도 달라진다.
    const theme = new MutationObserver(() => {
      readColors();
      if (reduced) draw(STILL_TIME);
    });
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    document.addEventListener('visibilitychange', play);
    play();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
      document.removeEventListener('visibilitychange', play);
      gl.deleteBuffer(buffer);
      // 컨텍스트는 반납하지 않는다. 같은 캔버스로 다시 마운트되면 getContext 가
      // 잃어버린 컨텍스트를 그대로 돌려줘 아무것도 그려지지 않는다.
      gl.deleteProgram(program);
    };
  }, [angle, scale, gain, reduced]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]',
        className
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);
  return program;
}

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
