// src/utils/devWatch.ts — what the dev server leaves out of its file watch (vite.config.ts,
// #250). Plain string work, so the config and the tests share it without Node's types.

/**
 * A watch matcher for this checkout's own `.claude/` folder, where Claude sessions keep
 * their worktrees: a tsconfig.json changing in one made Vite reload the game (#250). It is
 * anchored at `root`, so a checkout that is itself a worktree under another checkout's
 * `.claude/worktrees/` still watches its own files (the `**\/.claude/**` glob it replaces
 * matched every path there, and that dev server watched nothing).
 */
export function claudeDirIgnored(root: string): (file: string) => boolean {
  const dir = `${root.replace(/\\/g, '/').replace(/\/+$/, '')}/.claude`;
  return (file) => {
    const f = file.replace(/\\/g, '/');
    return f === dir || f.startsWith(`${dir}/`);
  };
}
