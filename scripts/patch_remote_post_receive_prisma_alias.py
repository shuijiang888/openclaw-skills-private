from pathlib import Path


HOOK_PATH = Path("/opt/git/profit-web.git/hooks/post-receive")


def main() -> int:
    text = HOOK_PATH.read_text()

    if "ensure_prisma_hash_aliases()" in text:
        print("already patched")
        return 0

    insert_after = 'echo_log "database ready ${db_file}"\n}\n\n'
    func = """ensure_prisma_hash_aliases() {
  node - <<'NODE'
const fs = require("fs");
const path = require("path");
const roots = [
  ".next/server/chunks/ssr",
  ".next/standalone/.next/server/chunks/ssr",
];
const re = /@prisma\\/client-[a-f0-9]+/g;
const names = new Set();

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      walk(p);
      continue;
    }
    if (!s.isFile() || !p.endsWith(".js")) continue;
    const txt = fs.readFileSync(p, "utf8");
    const ms = txt.match(re);
    if (ms) {
      for (const x of ms) names.add(x.split("/")[1]);
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) walk(root);
}

if (names.size === 0) {
  console.log("[post-receive] prisma alias not needed");
  process.exit(0);
}

for (const base of ["node_modules/@prisma", ".next/standalone/node_modules/@prisma"]) {
  fs.mkdirSync(base, { recursive: true });
  for (const name of names) {
    const linkPath = path.join(base, name);
    try { fs.rmSync(linkPath, { recursive: true, force: true }); } catch {}
    fs.symlinkSync("client", linkPath, "dir");
    console.log(`[post-receive] prisma alias ${linkPath} -> client`);
  }
}
NODE
}

"""
    if insert_after not in text:
        raise SystemExit("cannot find insert point for function")
    text = text.replace(insert_after, insert_after + func)

    call_anchor = (
        "  mkdir -p .next/standalone/node_modules\n"
        "  cp -a node_modules/.prisma .next/standalone/node_modules/ || true\n"
    )
    if call_anchor not in text:
        raise SystemExit("cannot find call anchor")
    text = text.replace(call_anchor, call_anchor + "  ensure_prisma_hash_aliases\n")

    HOOK_PATH.write_text(text)
    print("patched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
