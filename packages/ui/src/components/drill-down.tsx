'use client';

import {
  AnimatePresence,
  type Transition,
  animate as animateValue,
  motion,
  useIsPresent,
  useIsomorphicLayoutEffect,
  useMotionValue,
  useReducedMotion,
} from 'motion/react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '../lib/utils';

// globals.css 의 --ease-out-expo 와 같은 곡선. 프로젝트의 나머지 모션이 CSS keyframes 로
// 이 곡선을 쓰므로 값을 맞춰야 드릴다운만 감속이 튀지 않는다. 스프링은 쓰지 않는다.
const EASE: Transition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };

const VIEW_MARKER = Symbol.for('rillroot.drill-down.view');

const isDev = process.env.NODE_ENV !== 'production';

type DrillDownNav = {
  push(id: string): void;
  /** 실제로 되돌아갔으면 true, 첫 뷰라 할 게 없었으면 false. */
  pop(): boolean;
  /** 0 이면 첫 뷰. */
  depth: number;
};

export type DrillDownHandle = DrillDownNav;

const DrillDownContext = createContext<DrillDownNav | null>(null);

export function useDrillDown() {
  const nav = useContext(DrillDownContext);
  if (!nav) throw new Error('useDrillDown 은 <DrillDown> 안에서만 쓸 수 있다.');
  return nav;
}

type DrillDownViewProps = {
  id: string;
  title?: React.ReactNode;
  /** 헤더 좌측 슬롯. 보통 취소/뒤로. */
  leading?: React.ReactNode;
  /** 헤더 우측 슬롯. 보통 완료. */
  trailing?: React.ReactNode;
  className?: string;
  // 렌더 프롭을 받는 이유: useDrillDown 은 DrillDown 안에서 렌더되는 컴포넌트에서만
  // 동작하는데, 뷰를 선언하는 쪽은 대개 그 바깥이다. 렌더 프롭이 없으면 push 하나
  // 붙이려고 매번 자식 컴포넌트를 새로 파야 한다.
  children?: React.ReactNode | ((nav: DrillDownNav) => React.ReactNode);
};

/**
 * 뷰 선언용. DrillDown 이 props 만 읽어가므로 이 컴포넌트 자체는 아무것도 그리지 않는다.
 */
export function DrillDownView(_: DrillDownViewProps): null {
  return null;
}
// 참조 비교(child.type === DrillDownView)는 사용자 래퍼 컴포넌트나 갈라진 모듈
// 인스턴스에서 조용히 깨진다. 정적 마커로 식별한다.
Object.assign(DrillDownView, { [VIEW_MARKER]: true });

function isView(
  node: React.ReactNode
): node is React.ReactElement<DrillDownViewProps> {
  if (!isValidElement(node)) return false;
  const type = node.type;
  if (typeof type === 'string') return false;
  return (type as unknown as Record<symbol, unknown>)[VIEW_MARKER] === true;
}

function Frame({
  view,
  nav,
  maxHeight,
  autoFocus,
  dialogTitle,
  onMeasure,
}: {
  view: DrillDownViewProps;
  nav: DrillDownNav;
  maxHeight: string;
  autoFocus: boolean;
  dialogTitle: boolean;
  onMeasure(height: number): void;
}) {
  // 빠져나가는 동안 AnimatePresence 가 이 프레임을 계속 마운트해 둔다.
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);

  // 전환 중에는 두 프레임이 함께 떠 있다. 둘 다 Radix Title 이면 같은 titleId 가
  // 양쪽에 박혀 DOM id 가 중복된다. 들어오는 쪽만 진짜 Title 로 그린다.
  const Heading = dialogTitle && isPresent ? DialogPrimitive.Title : 'h2';

  // 페인트 전에 재야 한다. 뷰가 바뀌는 커밋에서 컨테이너는 아직 이전 높이를 붙들고
  // 있고, 새 프레임은 그 안에서 잘린 채다. 여기서 실제 높이를 넘겨 전환을 시작한다.
  useIsomorphicLayoutEffect(() => {
    if (!isPresent) return;
    const el = ref.current;
    if (!el) return;

    const report = () => onMeasure(el.getBoundingClientRect().height);
    report();

    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPresent, onMeasure]);

  // inert 가 붙는 순간 브라우저가 blur 시키며 relatedTarget === null 인 focusout 을
  // 내는데, Radix FocusScope 는 정확히 그 조건에서 early return 한다. 직접 옮기지
  // 않으면 포커스가 전환 내내 body 에 머문다. preventScroll 은 필수 — 없으면
  // 브라우저가 컨테이너를 스크롤해 트랙이 어긋난다.
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const body =
    typeof view.children === 'function' ? view.children(nav) : view.children;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      inert={!isPresent}
      style={{ maxHeight }}
      className={cn(
        'w-full overflow-y-auto overscroll-contain outline-none',
        view.className
      )}
    >
      {(view.title || view.leading || view.trailing) && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-4 py-3">
          <span className="justify-self-start">{view.leading}</span>
          <Heading className="truncate text-sm font-semibold">
            {view.title}
          </Heading>
          <span className="justify-self-end">{view.trailing}</span>
        </div>
      )}
      {body}
    </div>
  );
}

/**
 * 모달 안에서 하위 뷰를 밀어 넣고(push) 되돌리는(pop) 내비게이션 스택.
 *
 * 활성 프레임만 마운트하고, 교체는 AnimatePresence 가 처리한다 — 나가는 프레임의
 * 언마운트 시점을 직접 재거나 타이머로 자를 필요가 없다.
 */
export function DrillDown({
  children,
  className,
  maxHeight = '70dvh',
  dialogTitle = true,
  ref,
}: {
  children: React.ReactNode;
  className?: string;
  /** 프레임 높이 상한. Drawer 의 max-h-[80vh] 보다 낮아야 시트 밖으로 안 넘친다. */
  maxHeight?: string;
  /**
   * 뷰 제목을 Dialog 의 접근성 제목으로 그린다. Radix Title 은 Dialog 밖에서 예외를
   * 던지므로 드롭다운 같은 곳에 둘 때는 끈다.
   */
  dialogTitle?: boolean;
  ref?: React.Ref<DrillDownHandle>;
}) {
  const views = useMemo(() => {
    const collected = new Map<string, DrillDownViewProps>();
    for (const child of Children.toArray(children)) {
      if (!isView(child)) {
        // Children.toArray 는 Fragment 를 평탄화하지 않는다. 감싸면 조용히 사라진다.
        if (isDev) {
          console.error(
            '<DrillDown> 의 자식은 <DrillDownView> 여야 한다. Fragment 로 감싸면 인식되지 않는다.'
          );
        }
        continue;
      }
      if (isDev && collected.has(child.props.id)) {
        console.error(`<DrillDownView id="${child.props.id}"> 가 중복됐다.`);
      }
      collected.set(child.props.id, child.props);
    }
    return collected;
  }, [children]);

  const rootId = views.keys().next().value ?? '';
  const [path, setPath] = useState<string[]>(() => [rootId]);
  const [direction, setDirection] = useState<1 | -1>(1);

  // height 를 state 가 아니라 motion value 로 두는 게 핵심이다. style 로 바인딩하면
  // 인라인 height 가 한 프레임도 끊기지 않는다. state + animate prop 으로 하면 뷰가
  // 바뀌는 커밋에 명시 높이가 사라져 자연 높이로 튄 뒤 그 값에서 "애니메이션" 하느라
  // 아무 일도 일어나지 않는다.
  const height = useMotionValue<string | number>('auto');

  // 첫 프레임은 포커스를 뺏지 않는다 — 모달 진입 포커스는 Radix 가 잡는다.
  const navigated = useRef(false);
  const depth = path.length - 1;

  const push = useCallback((id: string) => {
    navigated.current = true;
    setDirection(1);
    setPath((p) => (p.at(-1) === id ? p : [...p, id]));
  }, []);

  const pop = useCallback(() => {
    if (depth === 0) return false;
    navigated.current = true;
    setDirection(-1);
    setPath((p) => p.slice(0, -1));
    return true;
  }, [depth]);

  const nav = useMemo(() => ({ push, pop, depth }), [push, pop, depth]);
  useImperativeHandle(ref, () => nav, [nav]);

  const reduced = useReducedMotion();
  const transition = useMemo<Transition>(
    () => (reduced ? { duration: 0 } : EASE),
    [reduced]
  );

  const onMeasure = useCallback(
    (next: number) => {
      const current = height.get();
      // 첫 측정은 붙잡아만 둔다 — auto 에서 px 로는 보간할 수 없다.
      if (typeof current !== 'number' || reduced) {
        height.set(next);
        return;
      }
      if (Math.abs(current - next) < 0.5) return;
      animateValue(height, next, transition);
    },
    [height, reduced, transition]
  );

  const activeId = path.at(-1) ?? rootId;
  const active = views.get(activeId);
  if (!active) return null;

  return (
    <DrillDownContext.Provider value={nav}>
      <motion.div
        // overflow-hidden 은 여전히 스크롤 컨테이너라, 프레임 안에서 focus() 한 번이면
        // 브라우저가 scrollLeft 를 밀어 화면이 영구히 어긋나고 vaul 의 드래그-투-디스미스도
        // 죽는다. overflow-clip 은 스크롤 컨테이너가 아니라 그 일이 불가능하다.
        className={cn('relative overflow-clip', className)}
        style={{ height }}
      >
        {/* popLayout 이 나가는 프레임을 position:absolute 로 흐름에서 빼준다.
            덕분에 들어오는 프레임만 높이를 결정한다. */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeId}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%' }),
              center: { x: 0 },
              exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%' }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <Frame
              view={active}
              nav={nav}
              maxHeight={maxHeight}
              autoFocus={navigated.current}
              dialogTitle={dialogTitle}
              onMeasure={onMeasure}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </DrillDownContext.Provider>
  );
}
