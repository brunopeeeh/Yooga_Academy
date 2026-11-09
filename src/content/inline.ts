import type { InlineToken } from './types';

const TAG_PATTERN = /<(kbd|b)>([\s\S]*?)<\/\1>/g;

/**
 * Converte os trechos com `<kbd>`/`<b>` do protótipo em tokens seguros.
 * Qualquer outra marcação é mantida como texto, sem `innerHTML`.
 */
export function inline(source: string): readonly InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  for (const match of source.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({ type: 'text', value: source.slice(lastIndex, index) });
    }

    tokens.push({
      type: match[1] === 'kbd' ? 'key' : 'strong',
      value: match[2] ?? '',
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < source.length) {
    tokens.push({ type: 'text', value: source.slice(lastIndex) });
  }

  return tokens;
}
