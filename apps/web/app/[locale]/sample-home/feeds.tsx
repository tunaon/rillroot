import { CloudSun } from 'lucide-react';
import { Fragment } from 'react';
import InfiniteList from './infinite-list';
import PostCard, { type Post } from './post-card';

// 샘플 무한 스크롤이 같은 포스트를 몇 번 이어 붙일지.
const PAGES = 3;

const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=75&auto=format`;

const POSTS: Post[] = [
  {
    id: 'p1',
    author: {
      name: '김하늘',
      handle: 'haneul.sky',
      avatar: unsplash('1494790108377-be9c29b29330', 96, 96),
    },
    time: '12m',
    text: '오늘 퇴근길 하늘. 폭풍 오기 전 30분이 제일 예쁘다는 걸 이제 알았다 ⛈️\n#퇴근길 #하늘기록',
    media: [unsplash('1527482797697-8795b05a13fe', 1200, 750)],
    stats: { likes: '1,284', replies: '86', reposts: '41' },
    delay: '[animation-delay:.12s]',
  },
  {
    id: 'p2',
    author: {
      name: 'Aurora',
      handle: 'aurora',
      verified: true,
      icon: CloudSun,
    },
    time: '1h',
    text: '예보 정확도를 높이는 새 모델을 배포했어요. 6시간 단위 강수 확률 오차가 평균 11% 줄었습니다. 무엇이 달라졌는지는 아래 노트에 정리했어요 👇',
    link: {
      title: 'Nowcast v3 — 강수 예보에서 무엇이 달라졌나',
      domain: 'aurora.app',
      image: unsplash('1594156596782-656c93e4d504', 320, 320),
    },
    stats: { likes: '3.2K', replies: '212', reposts: '540' },
    delay: '[animation-delay:.2s]',
  },
  {
    id: 'p3',
    author: {
      name: '박도윤',
      handle: 'doyun.dev',
      avatar: unsplash('1507003211169-0a1dd7228f2d', 96, 96),
    },
    time: '3h',
    text: '리퀴드 글라스 UI를 실제 제품에 넣어보고 배운 것 세 가지.\n\n1. backdrop-filter 는 뒤에 뭔가 있어야 유리가 된다. 단색 위에서는 그냥 반투명 판이다.\n2. 광택(sheen) 애니메이션은 반드시 카드 밖까지 빠져나가게 끝내야 한다. 안 그러면 모서리에 잔상이 남는다.\n3. 접근성은 prefers-reduced-motion 한 줄이 아니라, 모션이 없어도 상태가 읽히는지로 판단해야 한다.\n\n다음 글에서는 성능 이야기를 해볼게요.',
    stats: { likes: '892', replies: '47', reposts: '128' },
    delay: '[animation-delay:.28s]',
  },
  {
    id: 'p4',
    author: {
      name: '이서연',
      handle: 'seoyeon.trip',
      avatar: unsplash('1438761681033-6461ffad8d80', 96, 96),
    },
    time: '5h',
    text: '발리 대신 제주. 3일 내내 비 예보였는데 결국 한 번도 안 왔다 🙃',
    media: [
      unsplash('1506905925346-21bda4d32df4', 800, 800),
      unsplash('1561484930-998b6a7b22e8', 800, 800),
    ],
    stats: { likes: '2,047', replies: '133', reposts: '64' },
    delay: '[animation-delay:.36s]',
  },
  {
    id: 'p5',
    author: {
      name: '최민준',
      handle: 'minjun.c',
      avatar: unsplash('1472099645785-5658abf4ff4e', 96, 96),
    },
    time: '8h',
    repostedBy: '박도윤',
    text: '이 글 저장. 다음 프로젝트 온보딩 문서에 그대로 넣을 예정.',
    quote: {
      author: {
        name: '정우진',
        handle: 'woojin.j',
        verified: true,
        avatar: unsplash('1519345182560-3f2917c472ef', 96, 96),
      },
      time: '1d',
      text: '주니어에게 코드 리뷰 코멘트를 남길 때 — 1) 왜 2) 대안 3) 참고 링크. 이 순서만 지켜도 리뷰 분위기가 달라집니다.',
    },
    stats: { likes: '5.6K', replies: '318', reposts: '1,102' },
    delay: '[animation-delay:.44s]',
  },
  {
    id: 'p6',
    author: {
      name: '한지우',
      handle: 'jiwoo.run',
      avatar: unsplash('1534528741775-53994a69daeb', 96, 96),
    },
    time: '1d',
    text: '주말 러닝 10km 완료. 습도 90%에서 뛰는 건 사실상 수영이었다 🏃‍♀️',
    stats: { likes: '416', replies: '29', reposts: '7' },
    delay: '[animation-delay:.52s]',
  },
  {
    id: 'p7',
    author: {
      name: '정은채',
      handle: 'eunchae.film',
      avatar: unsplash('1544005313-94ddf0286df2', 96, 96),
    },
    time: '2d',
    text: '올해 찍은 하늘 중 다섯 장만 골랐다. 전부 같은 폰, 보정 없음.\n\n세 번째는 태풍 오기 전날 오후, 네 번째는 새벽 5시 40분.\n마지막 장 오른쪽 위에 별똥별 있다. 찍고 나서야 알았음 🌠',
    media: [
      unsplash('1504608524841-42fe6f032b4b', 800, 1000),
      unsplash('1499346030926-9a72daac6c63', 800, 1000),
      unsplash('1534088568595-a066f410bcda', 800, 1000),
      unsplash('1494548162494-384bba4ab999', 800, 1000),
      unsplash('1419242902214-272b3f66ee7a', 800, 1000),
    ],
    stats: { likes: '7.1K', replies: '264', reposts: '1,893' },
    delay: '[animation-delay:.6s]',
  },
];

/**
 * 피드 한 곳. 데이터와 페이지 조립을 여기서 관리하고, 무한 스크롤만 클라이언트에 맡긴다.
 *
 * 서버에서 미리 그린 페이지를 넘기는 이유: Post.author.icon 이 컴포넌트 함수라 직렬화할 수
 * 없어 데이터 자체는 클라이언트로 못 넘긴다. 실제 API 를 붙이면 데이터가 JSON 이 되므로
 * 이 제약은 사라지고, 그때 바꿀 곳도 이 파일 안이다.
 */
export default function Feeds() {
  return (
    <InfiniteList
      pages={Array.from({ length: PAGES }, (_, i) => (
        // Fragment 라 포스트가 모두 목록의 직계 자식이 되어 구분선이 페이지 경계에서도 이어진다.
        <Fragment key={i}>
          {POSTS.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </Fragment>
      ))}
    />
  );
}
