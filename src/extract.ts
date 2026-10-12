import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit } from 'unist-util-visit';

export type MermaidBlock = {
  source: string;
  start: number;
  end: number;
};

export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  visit(fromMarkdown(markdown), 'code', (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (node.lang !== 'mermaid' || start === undefined || end === undefined)
      return;
    blocks.push({ source: node.value, start, end });
  });
  return blocks;
}
