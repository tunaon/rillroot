'use client';

import type { JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';

interface Props {
  /** 처음 보여줄 본문. 이후의 변경은 에디터가 갖고 onChange 로만 알린다. */
  initialBody: string;
  label: string;
  placeholder: string;
  autoFocus?: boolean;
  onChange(body: string): void;
}

/** 평문 한 줄이 문단 하나가 된다. 줄바꿈 문자와 문단 경계는 둘 다 평문으로 돌아올 때 개행이다. */
function toDocument(body: string): JSONContent {
  return {
    type: 'doc',
    content: body.split('\n').map((line) => ({
      type: 'paragraph',
      ...(line && { content: [{ type: 'text', text: line }] }),
    })),
  };
}

/**
 * 조각 하나의 편집기. 서식 없는 문서·문단·줄바꿈만 두어 출력은 언제나 평문이다.
 * contenteditable 을 쓰는 이유는 나중에 링크·멘션·한도 초과 구간을 본문을 바꾸지 않고
 * 칠하기 위해서다. 그 데코레이션은 채널이 생길 때 붙인다.
 */
export default function SegmentEditor({
  initialBody,
  label,
  placeholder,
  autoFocus,
  onChange,
}: Props) {
  // 에디터는 한 번 만들어지고 옵션은 처음 값을 붙든다. 최신 콜백을 ref 로 잇는다.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      UndoRedo,
      Placeholder.configure({ placeholder }),
    ],
    content: toDocument(initialBody),
    autofocus: autoFocus ? 'end' : false,
    // 서버에서 그리지 않는다. contenteditable 은 브라우저에서만 의미가 있고,
    // 미리 그리면 하이드레이션이 어긋난다.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': label,
        class:
          'min-h-16 py-1 text-base break-words whitespace-pre-wrap outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChangeRef.current(instance.getText({ blockSeparator: '\n' }));
    },
  });

  return <EditorContent editor={editor} />;
}
