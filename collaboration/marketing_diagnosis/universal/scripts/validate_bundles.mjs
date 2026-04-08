#!/usr/bin/env node
/**
 * 校验 questionnaire.bundle.js + rubrics.bundle.js 与 H5 预期结构一致。
 * 用法：node scripts/validate_bundles.mjs   （在 universal/ 目录下执行）
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadQuestionnaire() {
  const code = fs.readFileSync(path.join(root, "data/questionnaire.bundle.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.UNIVERSAL_QUESTIONNAIRE || sandbox.window.UNIVERSAL_QUESTIONNAIRE_BUNDLE;
}

function loadRubrics() {
  const code = fs.readFileSync(path.join(root, "data/rubrics.bundle.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.UNIVERSAL_RUBRICS || sandbox.window.UNIVERSAL_RUBRICS_BUNDLE;
}

function questionsOfDim(d) {
  if (!d) return [];
  if (Array.isArray(d.questions)) return d.questions;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.list)) return d.list;
  return [];
}

function countQuestions(dims) {
  let n = 0;
  for (const d of dims) {
    const qs = questionsOfDim(d);
    for (const q of qs) {
      if (q && Array.isArray(q.options) && q.options.length) n++;
    }
  }
  return n;
}

function validateQuestionnaire(Q) {
  const errors = [];
  if (!Q || typeof Q !== "object") {
    errors.push("questionnaire root missing");
    return errors;
  }
  let roles = Q.roles;
  if (!roles && Q.default && typeof Q.default === "object") {
    roles = Q.default.roles || Q.default;
  }
  if (!roles || typeof roles !== "object") {
    errors.push("no Q.roles (or Q.default)");
    return errors;
  }

  const modes = ["raw_material", "semi_custom", "standard_product", "solution"];
  const rep = roles.sales_rep || roles.salesRep;
  if (!rep || !rep.modes) {
    errors.push("missing sales_rep.modes");
  } else {
    for (const m of modes) {
      const mo = rep.modes[m];
      if (!mo || !Array.isArray(mo.dimensions)) {
        errors.push(`sales_rep.modes.${m} missing or no dimensions[]`);
        continue;
      }
      const n = countQuestions(mo.dimensions);
      if (n === 0) errors.push(`sales_rep.modes.${m}: zero scorable questions`);
    }
  }

  for (const key of ["sales_manager", "marketing_system"]) {
    const block = roles[key] || roles[key === "sales_manager" ? "salesManager" : "marketingSystem"];
    if (!block || !Array.isArray(block.dimensions)) {
      errors.push(`missing ${key}.dimensions[]`);
      continue;
    }
    const n = countQuestions(block.dimensions);
    if (n === 0) errors.push(`${key}: zero scorable questions`);
  }

  return errors;
}

function validateRubrics(R) {
  const errors = [];
  if (!R || typeof R !== "object") {
    errors.push("rubrics missing");
    return errors;
  }
  let r = R;
  if (!R.gradeBands && R.default && R.default.gradeBands) r = R.default;
  if (!r.gradeBands || !r.generic_by_band) {
    errors.push("rubrics missing gradeBands or generic_by_band");
  }
  for (const b of ["C", "B", "A"]) {
    if (!r.generic_by_band || !r.generic_by_band[b]) errors.push(`generic_by_band.${b} missing`);
  }
  return errors;
}

const Q = loadQuestionnaire();
const R = loadRubrics();

const eq = validateQuestionnaire(Q);
const er = validateRubrics(R);

if (eq.length || er.length) {
  console.error("validate_bundles: FAIL");
  eq.forEach((e) => console.error("  [Q]", e));
  er.forEach((e) => console.error("  [R]", e));
  process.exit(1);
}

console.log("validate_bundles: OK (questionnaire + rubrics structure)");
process.exit(0);
