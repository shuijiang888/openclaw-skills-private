/**
 * 限制 OLLAMA_BASE_URL 可指向的目标，降低服务端请求伪造（SSRF）风险。
 * 远程 Ollama 需显式开启 OLLAMA_ALLOW_REMOTE_HOST=1 或使用 OLLAMA_HOST_ALLOWLIST。
 */

const BLOCKED_HOSTS = new Set(
  [
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.goog",
  ].map((h) => h.toLowerCase()),
);

function parseHostPort(hostname: string): { host: string; port: string | null } {
  if (hostname.startsWith("[")) {
    const end = hostname.indexOf("]");
    if (end > 0) {
      const host = hostname.slice(1, end).toLowerCase();
      const rest = hostname.slice(end + 1);
      const port = rest.startsWith(":") ? rest.slice(1) : null;
      return { host, port };
    }
  }
  const colon = hostname.lastIndexOf(":");
  if (colon > 0 && !hostname.includes("]")) {
    const maybePort = hostname.slice(colon + 1);
    if (/^\d+$/.test(maybePort)) {
      return {
        host: hostname.slice(0, colon).toLowerCase(),
        port: maybePort,
      };
    }
  }
  return { host: hostname.toLowerCase(), port: null };
}

function isPrivateOrLocalIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return false;
  return false;
}

function allowlistFromEnv(): Set<string> {
  const raw = process.env.OLLAMA_HOST_ALLOWLIST?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function assertOllamaBaseUrlSafe(rawBaseUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error("OLLAMA_BASE_URL 不是合法 URL");
  }

  if (url.username || url.password) {
    throw new Error("OLLAMA_BASE_URL 不得包含内嵌账号密码");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OLLAMA_BASE_URL 仅允许 http(s):");
  }

  const { host } = parseHostPort(url.hostname);
  if (!host || BLOCKED_HOSTS.has(host)) {
    throw new Error("OLLAMA_BASE_URL 指向的主机被策略禁止");
  }

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1"
  ) {
    return;
  }

  if (allowlistFromEnv().has(host)) {
    return;
  }

  if (isPrivateOrLocalIpv4(host)) {
    return;
  }

  const trustRemote = process.env.OLLAMA_ALLOW_REMOTE_HOST?.trim();
  if (trustRemote === "1" || trustRemote?.toLowerCase() === "true") {
    return;
  }

  throw new Error(
    "OLLAMA_BASE_URL 主机不在内网/本机范围。若 Ollama 在独立服务器上，请设置 OLLAMA_ALLOW_REMOTE_HOST=1 或将主机加入 OLLAMA_HOST_ALLOWLIST。",
  );
}
