export const CELL_WIDTH = 8;

const DEFAULT_COLUMNS = 80;

export function supportsKittyGraphics(
  env: NodeJS.ProcessEnv,
  isTTY: boolean,
): boolean {
  if (!isTTY || env.TMUX !== undefined) return false;
  const term = env.TERM ?? '';
  return (
    env.TERM_PROGRAM === 'ghostty' ||
    term.includes('xterm-ghostty') ||
    term.includes('xterm-kitty') ||
    env.KITTY_WINDOW_ID !== undefined
  );
}

export function terminalColumns(stream: NodeJS.WriteStream): number {
  return stream.columns > 0 ? stream.columns : DEFAULT_COLUMNS;
}
