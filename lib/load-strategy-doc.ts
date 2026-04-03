import { readFile } from "fs/promises";
import path from "path";

const FILE = "VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md";

/**
 * 开发环境优先读 monorepo `../docs`（单一信源）；生产构建只读 `content/`，避免打包追踪上级目录。
 */
export async function loadStrategyMarkdown(): Promise<string> {
  const packaged = path.join(process.cwd(), "content", FILE);

  if (process.env.NODE_ENV !== "production") {
    try {
      return await readFile(path.join(process.cwd(), "..", "docs", FILE), "utf8");
    } catch {
      /* use packaged copy */
    }
  }

  return await readFile(packaged, "utf8");
}
