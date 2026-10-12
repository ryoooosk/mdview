import { createRequire } from 'node:module';
import { type ParseMDDOptions, renderMermaid } from '@mermaid-js/mermaid-cli';
import puppeteer, { type Browser } from 'puppeteer';

export const DEVICE_SCALE_FACTOR = 2;

// mermaid は mermaid-cli の依存パッケージで、mdview からは直接 import できないため、mermaid-cli の場所から解決する
export const MERMAID_VERSION: string = createRequire(
  import.meta.resolve('@mermaid-js/mermaid-cli'),
)('mermaid/package.json').version;

const DIAGRAM_TYPES = [
  'flowchart',
  'swimlane',
  'agentflow',
  'sequence',
  'gantt',
  'journey',
  'timeline',
  'class',
  'state',
  'er',
  'pie',
  'quadrantChart',
  'xyChart',
  'requirement',
  'architecture',
  'mindmap',
  'ishikawa',
  'kanban',
  'gitGraph',
  'c4',
  'sankey',
  'packet',
  'block',
  'eventmodeling',
  'treeView',
  'radar',
  'usecase',
  'venn',
  'cynefin',
  'railroad',
] as const;

export const RENDER_OPTIONS: ParseMDDOptions = {
  backgroundColor: 'transparent',
  mermaidConfig: {
    theme: 'dark',
    // 既定の neo は四角に影が付き、themeVariables.dropShadow ではシーケンス図の影が消えないため
    look: 'classic',
    ...Object.fromEntries(
      DIAGRAM_TYPES.map((type) => [type, { useMaxWidth: false }]),
    ),
  },
  viewport: {
    // ターミナルの桁数に合わせないのは、桁数をキャッシュのキーに入れると、幅を変えるたびに描き直しになるため。幅で大きさが変わるのは gantt と xychart だけ
    width: 800,
    // 高さは renderMermaid が図に合わせて変えるため、どの値でもよい
    height: 600,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  },
};

const STACK_FRAME = /\(\S+:\d+:\d+\)$/;

export type Renderer = {
  render(source: string): Promise<Uint8Array>;
  close(): Promise<void>;
};

export function createRenderer(): Renderer {
  let browser: Promise<Browser> | undefined;
  return {
    async render(source) {
      browser ??= puppeteer.launch({ channel: 'chrome', headless: true });
      try {
        const { data } = await renderMermaid(
          await browser,
          source,
          'png',
          RENDER_OPTIONS,
        );
        return data;
      } catch (error) {
        // メッセージをそのまま使わないのは、puppeteer がブラウザ側のスタックトレースを末尾に付けるため
        if (!(error instanceof Error)) throw error;
        const message = error.message
          .split('\n')
          .filter((line) => !STACK_FRAME.test(line))
          .join('\n');
        throw new Error(message, { cause: error });
      }
    },
    async close() {
      // 起動の失敗は render で図ごとに報告済みなので、ここでは投げ直さない
      const launched = await browser?.catch(() => undefined);
      await launched?.close();
    },
  };
}
