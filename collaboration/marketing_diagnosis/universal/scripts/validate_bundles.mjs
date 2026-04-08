/**
 * 校验 universal 题本与研判包结构（发布前可选执行）
 * 用法：cd collaboration/marketing_diagnosis/universal && node scripts/validate_bundles.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");

function loadBundleGlobal(fileName, prop) {
  const p = path.join(dataDir, fileName);
  if (!fs.existsSync(p)) {
    throw new Error("missing file: " + p);
  }
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: fileName });
  let v = ctx.window[prop] || ctx.window[prop + "_BUNDLE"];
  if (v && typeof v === "object" && v.default) v = v.default;
  return v;
}

function isObj(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function err(msg) {
  console.error("[validate_bundles] FAIL: " + msg);
  process.exit(1);
}

function ok(msg) {
  console.log("[validate_bundles] OK: " + msg);
}

const Q = loadBundleGlobal("questionnaire.bundle.js", "UNIVERSAL_QUESTIONNAIRE");
const R = loadBundleGlobal("rubrics.bundle.js", "UNIVERSAL_RUBRICS");

if (!isObj(Q)) err("questionnaire root is not an object");
if (!isObj(R)) err("rubrics root is not an object");

const gb = R.gradeBands;
if (!isObj(gb)) err("R.gradeBands missing");
for (const k of ["C", "B", "A"]) {
  if (!Array.isArray(gb[k]) || gb[k].length < 2) err("R.gradeBands." + k + " must be [min,max]");
}
if (!isObj(R.generic_by_band)) err("R.generic_by_band missing");
for (const b of ["A", "B", "C"]) {
  const g = R.generic_by_band[b];
  if (!isObj(g)) err("R.generic_by_band." + b + " missing");
}

function checkQuestions(dimensions, label) {
  for (let di = 0; di < dimensions.length; di++) {
    const d = dimensions[di];
    if (!isObj(d)) err(label + " dimension " + di + " invalid");
    const qs = d.questions;
    if (!Array.isArray(qs)) err(label + " dimension " + (d.name || di) + " has no questions[]");
    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi];
      if (!isObj(q)) err(label + " question missing object at " + di + "." + qi);
      if (!Array.isArray(q.options) || q.options.length === 0) {
        err(label + " question " + (q.id || qi) + " has no options");
      }
    }
  }
}

const roles = Q.roles || Q.data?.roles || Q.questionnaire?.roles;
if (isObj(roles)) {
  for (const roleId of Object.keys(roles)) {
    const entry = roles[roleId];
    if (!isObj(entry)) continue;
    if (entry.modes || entry.salesModes) {
      const modes = entry.modes || entry.salesModes;
      if (!isObj(modes)) err("role " + roleId + " modes invalid");
      for (const mk of Object.keys(modes)) {
        const dims = modes[mk].dimensions || modes[mk].dimensionList;
        if (!Array.isArray(dims)) err("role " + roleId + " mode " + mk + " has no dimensions");
        checkQuestions(dims, "role " + roleId + " / " + mk);
      }
    } else {
      const dims = entry.dimensions || entry.dimensionList;
      if (!Array.isArray(dims)) err("role " + roleId + " has no dimensions");
      checkQuestions(dims, "role " + roleId);
    }
  }
} else if (Array.isArray(Q.dimensions)) {
  checkQuestions(Q.dimensions, "root");
} else {
  err("cannot find Q.roles or Q.dimensions");
}

ok("questionnaire + rubrics structure looks valid");
