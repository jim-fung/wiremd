/**
 * Task 3 fixtures: coss content emitters.
 *
 * One exact HTML + one exact JSX fixture per discriminant (heading, paragraph,
 * text, image, link, list, list-item, blockquote, code, table, table-header,
 * table-row, table-cell, separator), plus the family invariants: safe URLs,
 * format-specific escaping, thead-before-tbody ordering, no attribute ever
 * renders `undefined`, and deterministic output.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import type { WiremdNode } from '../src/types.js';

const html = (node: WiremdNode): string => generateCode(node);
const jsx = (node: WiremdNode): string => generateCode(node, { format: 'jsx' });

describe('content emitters: heading', () => {
  const LEVELS: ReadonlyArray<readonly [1 | 2 | 3 | 4 | 5 | 6, string]> = [
    [1, 'text-3xl'],
    [2, 'text-2xl'],
    [3, 'text-xl'],
    [4, 'text-lg'],
    [5, 'text-base'],
    [6, 'text-base'],
  ];

  test.each(LEVELS)('level %i maps to %s (html)', (level, size) => {
    expect(html({ type: 'heading', level, content: 'Overview', props: {} })).toBe(
      `<h${level} class="${size} font-semibold text-zinc-950">Overview</h${level}>`,
    );
  });

  test.each(LEVELS)('level %i maps to %s (jsx)', (level, size) => {
    expect(jsx({ type: 'heading', level, content: 'Overview', props: {} })).toBe(
      `<h${level} className="${size} font-semibold text-zinc-950">Overview</h${level}>`,
    );
  });

  test('children recurse and take precedence over content (html)', () => {
    const node: WiremdNode = {
      type: 'heading',
      level: 3,
      children: [
        { type: 'text', content: 'Styled ', props: {} },
        { type: 'text', content: 'heading', props: {} },
      ],
      props: {},
    };
    expect(html(node)).toBe(
      '<h3 class="text-xl font-semibold text-zinc-950"><span class="text-zinc-700 leading-6">Styled </span><span class="text-zinc-700 leading-6">heading</span></h3>',
    );
  });
});

describe('content emitters: paragraph', () => {
  const node: WiremdNode = {
    type: 'paragraph',
    content: 'Fish & "chips" — it\'s <best>',
    props: {},
  };

  test('escapes & < > quotes (html)', () => {
    expect(html(node)).toBe(
      '<p class="text-zinc-700 leading-6">Fish &amp; &quot;chips&quot; — it&#39;s &lt;best&gt;</p>',
    );
  });

  test('jsx text escapes & < > only, quotes stay raw', () => {
    expect(jsx(node)).toBe(
      '<p className="text-zinc-700 leading-6">Fish &amp; "chips" — it\'s &lt;best&gt;</p>',
    );
  });
});

describe('content emitters: text', () => {
  test('escapes & < > quotes (html)', () => {
    expect(html({ type: 'text', content: 'Tom & <Jerry> said "hi"' })).toBe(
      '<span class="text-zinc-700 leading-6">Tom &amp; &lt;Jerry&gt; said &quot;hi&quot;</span>',
    );
  });

  test('jsx escapes braces as string-literal expressions', () => {
    expect(jsx({ type: 'text', content: 'Tom & <Jerry> said {hi}' })).toBe(
      '<span className="text-zinc-700 leading-6">Tom &amp; &lt;Jerry&gt; said {\'{\'}hi{\'}\'}</span>',
    );
  });
});

describe('content emitters: image', () => {
  const node: WiremdNode = {
    type: 'image',
    src: 'https://example.com/shot.png',
    alt: 'An "overview" screenshot',
    props: { width: 640, height: 480, loading: 'lazy' },
  };

  test('src via safeUrl, alt escaped, optional width/height/loading (html)', () => {
    expect(html(node)).toBe(
      '<img src="https://example.com/shot.png" alt="An &quot;overview&quot; screenshot" width="640" height="480" loading="lazy" class="rounded-lg" />',
    );
  });

  test('jsx uses JSON-escaped attributes and className', () => {
    expect(jsx(node)).toBe(
      '<img src="https://example.com/shot.png" alt="An \\"overview\\" screenshot" width="640" height="480" loading="lazy" className="rounded-lg" />',
    );
  });

  test('absent optional props render nothing, never undefined (html)', () => {
    expect(html({ type: 'image', src: '', alt: 'Placeholder', props: {} })).toBe(
      '<img src="" alt="Placeholder" class="rounded-lg" />',
    );
  });

  test('unsafe src throws', () => {
    expect(() => html({ type: 'image', src: 'javascript:alert(1)', alt: 'x', props: {} })).toThrow(
      /Unsafe URL/,
    );
  });
});

describe('content emitters: link', () => {
  const node: WiremdNode = {
    type: 'link',
    href: 'https://example.com/docs?a=1&b=2',
    title: 'Docs & "more"',
    content: 'Read the docs',
    props: {},
  };

  test('safe href + escaped title (html)', () => {
    expect(html(node)).toBe(
      '<a href="https://example.com/docs?a=1&amp;b=2" title="Docs &amp; &quot;more&quot;" class="text-zinc-950 underline underline-offset-2">Read the docs</a>',
    );
  });

  test('jsx JSON-escaped attributes', () => {
    expect(jsx(node)).toBe(
      '<a href="https://example.com/docs?a=1&b=2" title="Docs & \\"more\\"" className="text-zinc-950 underline underline-offset-2">Read the docs</a>',
    );
  });

  test('children recurse inside the anchor (html)', () => {
    const nested: WiremdNode = {
      type: 'link',
      href: '#section',
      children: [{ type: 'text', content: 'Jump down', props: {} }],
      props: {},
    };
    expect(html(nested)).toBe(
      '<a href="#section" class="text-zinc-950 underline underline-offset-2"><span class="text-zinc-700 leading-6">Jump down</span></a>',
    );
  });

  test('no title attribute when title absent (jsx)', () => {
    expect(jsx({ type: 'link', href: '/about', content: 'About', props: {} })).toBe(
      '<a href="/about" className="text-zinc-950 underline underline-offset-2">About</a>',
    );
  });
});

describe('content emitters: list + list-item', () => {
  const node: WiremdNode = {
    type: 'list',
    ordered: false,
    props: {},
    children: [
      { type: 'list-item', content: 'First bullet', props: {} },
      {
        type: 'list-item',
        props: {},
        children: [
          { type: 'text', content: 'Nested:', props: {} },
          {
            type: 'list',
            ordered: true,
            props: {},
            children: [{ type: 'list-item', content: 'Deep numbered', props: {} }],
          },
        ],
      },
    ],
  };

  test('ul nests ol; items recurse (html)', () => {
    expect(html(node)).toBe(
      '<ul class="list-disc pl-5 text-zinc-700 space-y-1"><li>First bullet</li><li><span class="text-zinc-700 leading-6">Nested:</span><ol class="list-decimal pl-5 text-zinc-700 space-y-1"><li>Deep numbered</li></ol></li></ul>',
    );
  });

  test('ul nests ol; items recurse (jsx)', () => {
    expect(jsx(node)).toBe(
      '<ul className="list-disc pl-5 text-zinc-700 space-y-1"><li>First bullet</li><li><span className="text-zinc-700 leading-6">Nested:</span><ol className="list-decimal pl-5 text-zinc-700 space-y-1"><li>Deep numbered</li></ol></li></ul>',
    );
  });

  test('standalone list-item emits a bare li (html + jsx)', () => {
    const item: WiremdNode = { type: 'list-item', content: 'Solo item', props: {} };
    expect(html(item)).toBe('<li>Solo item</li>');
    expect(jsx(item)).toBe('<li>Solo item</li>');
  });
});

describe('content emitters: blockquote', () => {
  const node: WiremdNode = {
    type: 'blockquote',
    props: {},
    children: [
      { type: 'paragraph', content: 'First quoted line', props: {} },
      { type: 'paragraph', content: 'Second quoted line', props: {} },
    ],
  };

  test('bordered, italic, muted; children recurse (html)', () => {
    expect(html(node)).toBe(
      '<blockquote class="border-l-2 border-zinc-200 pl-4 italic text-zinc-600"><p class="text-zinc-700 leading-6">First quoted line</p><p class="text-zinc-700 leading-6">Second quoted line</p></blockquote>',
    );
  });

  test('bordered, italic, muted; children recurse (jsx)', () => {
    expect(jsx(node)).toBe(
      '<blockquote className="border-l-2 border-zinc-200 pl-4 italic text-zinc-600"><p className="text-zinc-700 leading-6">First quoted line</p><p className="text-zinc-700 leading-6">Second quoted line</p></blockquote>',
    );
  });
});

describe('content emitters: code', () => {
  test('inline code escapes & and quotes (html)', () => {
    expect(html({ type: 'code', value: 'npm install & "run"', inline: true })).toBe(
      '<code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[.8125rem] text-zinc-600">npm install &amp; &quot;run&quot;</code>',
    );
  });

  test('inline code keeps quotes raw in jsx', () => {
    expect(jsx({ type: 'code', value: 'npm install & "run"', inline: true })).toBe(
      '<code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[.8125rem] text-zinc-600">npm install &amp; "run"</code>',
    );
  });

  test('inline === false renders pre>code with lang class (html)', () => {
    expect(html({ type: 'code', value: 'const greeting = "hi";', lang: 'ts', inline: false })).toBe(
      '<pre class="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-50 overflow-x-auto"><code class="language-ts">const greeting = &quot;hi&quot;;</code></pre>',
    );
  });

  test('block code without lang emits a bare inner code (jsx)', () => {
    expect(jsx({ type: 'code', value: 'plain text block', inline: false })).toBe(
      '<pre className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-50 overflow-x-auto"><code>plain text block</code></pre>',
    );
  });

  test('omitted inline flag defaults to inline rendering (html)', () => {
    expect(html({ type: 'code', value: 'x === y' })).toBe(
      '<code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[.8125rem] text-zinc-600">x === y</code>',
    );
  });

  test('jsx code text escapes braces', () => {
    expect(jsx({ type: 'code', value: 'if (a) { return }', inline: true })).toBe(
      '<code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[.8125rem] text-zinc-600">if (a) {\'{\'} return {\'}\'}</code>',
    );
  });
});

describe('content emitters: table family', () => {
  const full: WiremdNode = {
    type: 'table',
    props: {},
    children: [
      {
        type: 'table-header',
        children: [
          {
            type: 'table-row',
            children: [
              { type: 'table-cell', content: 'Name', header: true },
              { type: 'table-cell', content: 'Role', header: true, align: 'left' },
            ],
          },
        ],
      },
      {
        type: 'table-row',
        children: [
          { type: 'table-cell', content: 'Ada', align: 'left' },
          { type: 'table-cell', content: 'Engineer', align: 'right' },
        ],
      },
    ],
  };

  const FULL_HTML =
    '<table class="w-full text-sm"><thead><tr><th class="border-b border-zinc-200 font-medium text-zinc-500 text-left">Name</th><th class="border-b border-zinc-200 font-medium text-zinc-500 text-left">Role</th></tr></thead><tbody><tr><td class="border-b border-zinc-200 text-zinc-700 text-left">Ada</td><td class="border-b border-zinc-200 text-zinc-700 text-right">Engineer</td></tr></tbody></table>';
  const FULL_JSX =
    '<table className="w-full text-sm"><thead><tr><th className="border-b border-zinc-200 font-medium text-zinc-500 text-left">Name</th><th className="border-b border-zinc-200 font-medium text-zinc-500 text-left">Role</th></tr></thead><tbody><tr><td className="border-b border-zinc-200 text-zinc-700 text-left">Ada</td><td className="border-b border-zinc-200 text-zinc-700 text-right">Engineer</td></tr></tbody></table>';

  test('full table with th/td styling and align classes (html)', () => {
    expect(html(full)).toBe(FULL_HTML);
  });

  test('full table with th/td styling and align classes (jsx)', () => {
    expect(jsx(full)).toBe(FULL_JSX);
  });

  test('rows listed before the header still render thead before tbody', () => {
    const swapped: WiremdNode = {
      type: 'table',
      props: {},
      children: [
        {
          type: 'table-row',
          children: [{ type: 'table-cell', content: 'Value', align: 'left' }],
        },
        {
          type: 'table-header',
          children: [
            {
              type: 'table-row',
              children: [{ type: 'table-cell', content: 'Key', header: true }],
            },
          ],
        },
      ],
    };
    expect(html(swapped)).toBe(
      '<table class="w-full text-sm"><thead><tr><th class="border-b border-zinc-200 font-medium text-zinc-500 text-left">Key</th></tr></thead><tbody><tr><td class="border-b border-zinc-200 text-zinc-700 text-left">Value</td></tr></tbody></table>',
    );
  });

  test('standalone table-header (html + jsx)', () => {
    const node: WiremdNode = {
      type: 'table-header',
      children: [
        {
          type: 'table-row',
          children: [{ type: 'table-cell', content: 'H', header: true }],
        },
      ],
    };
    expect(html(node)).toBe(
      '<thead><tr><th class="border-b border-zinc-200 font-medium text-zinc-500 text-left">H</th></tr></thead>',
    );
    expect(jsx(node)).toBe(
      '<thead><tr><th className="border-b border-zinc-200 font-medium text-zinc-500 text-left">H</th></tr></thead>',
    );
  });

  test('standalone table-row (html + jsx)', () => {
    const node: WiremdNode = {
      type: 'table-row',
      children: [
        { type: 'table-cell', content: 'R1', align: 'left' },
        { type: 'table-cell', content: 'R2' },
      ],
    };
    expect(html(node)).toBe(
      '<tr><td class="border-b border-zinc-200 text-zinc-700 text-left">R1</td><td class="border-b border-zinc-200 text-zinc-700">R2</td></tr>',
    );
    expect(jsx(node)).toBe(
      '<tr><td className="border-b border-zinc-200 text-zinc-700 text-left">R1</td><td className="border-b border-zinc-200 text-zinc-700">R2</td></tr>',
    );
  });

  test('header cell in a body row renders th with align override (html)', () => {
    expect(html({ type: 'table-cell', content: 'Grace', header: true, align: 'center' })).toBe(
      '<th class="border-b border-zinc-200 font-medium text-zinc-500 text-center">Grace</th>',
    );
  });

  test('plain td without align (jsx)', () => {
    expect(jsx({ type: 'table-cell', content: 'Data', align: 'right' })).toBe(
      '<td className="border-b border-zinc-200 text-zinc-700 text-right">Data</td>',
    );
  });

  test('cell children recurse (html)', () => {
    expect(
      html({
        type: 'table-cell',
        header: true,
        children: [{ type: 'text', content: 'cell text', props: {} }],
      }),
    ).toBe(
      '<th class="border-b border-zinc-200 font-medium text-zinc-500 text-left"><span class="text-zinc-700 leading-6">cell text</span></th>',
    );
  });
});

describe('content emitters: separator', () => {
  test('html + jsx pair stays pinned', () => {
    expect(html({ type: 'separator', props: {} })).toBe('<hr class="h-px w-full bg-zinc-200" />');
    expect(jsx({ type: 'separator', props: {} })).toBe('<hr className="h-px w-full bg-zinc-200" />');
  });
});

describe('content emitters: family invariants', () => {
  const OPTIONAL_LIGHT: ReadonlyArray<WiremdNode> = [
    { type: 'heading', level: 2, content: 'No extras', props: {} },
    { type: 'paragraph', content: 'plain', props: {} },
    { type: 'link', href: '/x', content: 'no title', props: {} },
    { type: 'image', src: '/i.png', alt: 'no dims', props: {} },
    { type: 'code', value: 'no lang' },
    { type: 'list', ordered: true, props: {}, children: [{ type: 'list-item', content: 'a', props: {} }] },
    { type: 'table-cell', content: 'no align' },
    { type: 'blockquote', props: {}, children: [{ type: 'paragraph', content: 'q', props: {} }] },
  ];

  test.each(OPTIONAL_LIGHT.map((node) => [node.type, node] as const))(
    '%s never renders undefined in any attribute (html + jsx)',
    (_type, node) => {
      expect(html(node)).not.toContain('undefined');
      expect(jsx(node)).not.toContain('undefined');
    },
  );

  test('output is deterministic across repeated calls (both formats)', () => {
    const doc: ReadonlyArray<WiremdNode> = [
      { type: 'heading', level: 1, content: 'Doc', props: {} },
      { type: 'paragraph', content: 'Body & "more"', props: {} },
      { type: 'separator', props: {} },
      { type: 'code', value: 'const a = 1;', lang: 'ts', inline: false },
      {
        type: 'table',
        props: {},
        children: [
          {
            type: 'table-header',
            children: [
              {
                type: 'table-row',
                children: [{ type: 'table-cell', content: 'K', header: true }],
              },
            ],
          },
          {
            type: 'table-row',
            children: [{ type: 'table-cell', content: 'V', align: 'center' }],
          },
        ],
      },
    ];
    for (const format of ['html', 'jsx'] as const) {
      const first = generateCode(doc, { format });
      const second = generateCode(doc, { format });
      expect(first).toBe(second);
      expect(first).not.toContain('undefined');
    }
  });
});
