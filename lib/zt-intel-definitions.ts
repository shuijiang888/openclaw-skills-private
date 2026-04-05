type JsonObject = Record<string, unknown>;

export type ZtIntelDefinitionView = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  requiredFields: string[];
  allowedSignalTypes: string[];
  allowedFormats: string[];
  taskTemplateHint: string;
  defaultRewardPoints: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

function normalizeStringList(values: unknown, fallback: string[]): string[] {
  const raw = Array.isArray(values) ? values : [];
  const normalized = raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, 24);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

export function parseJsonStringList(raw: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStringList(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function toJsonStringList(values: string[], fallback: string[]): string {
  const normalized = normalizeStringList(values, fallback);
  return JSON.stringify(normalized);
}

export function mapIntelDefinitionRow(row: {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  requiredFieldsJson: string;
  allowedSignalTypesJson: string;
  allowedFormatsJson: string;
  taskTemplateHint: string;
  defaultRewardPoints: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}): ZtIntelDefinitionView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    description: row.description,
    requiredFields: parseJsonStringList(row.requiredFieldsJson, []),
    allowedSignalTypes: parseJsonStringList(row.allowedSignalTypesJson, [
      "strategic",
      "tactical",
      "knowledge",
    ]),
    allowedFormats: parseJsonStringList(row.allowedFormatsJson, [
      "text",
      "image",
      "video",
      "voice",
      "link",
    ]),
    taskTemplateHint: row.taskTemplateHint,
    defaultRewardPoints: row.defaultRewardPoints,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function normalizeIntelPatch(input: JsonObject): {
  code?: string;
  name?: string;
  category?: string;
  description?: string;
  requiredFieldsJson?: string;
  allowedSignalTypesJson?: string;
  allowedFormatsJson?: string;
  taskTemplateHint?: string;
  defaultRewardPoints?: number;
  isActive?: boolean;
  sortOrder?: number;
} {
  const patch: {
    code?: string;
    name?: string;
    category?: string;
    description?: string;
    requiredFieldsJson?: string;
    allowedSignalTypesJson?: string;
    allowedFormatsJson?: string;
    taskTemplateHint?: string;
    defaultRewardPoints?: number;
    isActive?: boolean;
    sortOrder?: number;
  } = {};

  if (typeof input.code === "string") {
    patch.code =
      input.code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .slice(0, 48) || undefined;
  }
  if (typeof input.name === "string") {
    patch.name = input.name.trim().slice(0, 96) || undefined;
  }
  if (typeof input.category === "string") {
    patch.category = input.category.trim().toUpperCase().slice(0, 48) || "MARKET";
  }
  if (typeof input.description === "string") {
    patch.description = input.description.trim().slice(0, 300);
  }
  if (Array.isArray(input.requiredFields)) {
    patch.requiredFieldsJson = toJsonStringList(
      input.requiredFields.map((x) => String(x ?? "")),
      [],
    );
  }
  if (Array.isArray(input.allowedSignalTypes)) {
    patch.allowedSignalTypesJson = toJsonStringList(
      input.allowedSignalTypes.map((x) => String(x ?? "")),
      ["strategic", "tactical", "knowledge"],
    );
  }
  if (Array.isArray(input.allowedFormats)) {
    patch.allowedFormatsJson = toJsonStringList(
      input.allowedFormats.map((x) => String(x ?? "")),
      ["text", "image", "video", "voice", "link"],
    );
  }
  if (typeof input.taskTemplateHint === "string") {
    patch.taskTemplateHint = input.taskTemplateHint.trim().slice(0, 500);
  }
  if (typeof input.defaultRewardPoints === "number" && Number.isFinite(input.defaultRewardPoints)) {
    patch.defaultRewardPoints = Math.max(1, Math.min(500, Math.floor(input.defaultRewardPoints)));
  }
  if (typeof input.isActive === "boolean") {
    patch.isActive = input.isActive;
  }
  if (typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)) {
    patch.sortOrder = Math.max(0, Math.min(9999, Math.floor(input.sortOrder)));
  }

  return patch;
}

export function pickRequiredFieldMisses(
  requiredFields: string[],
  submitted: Record<string, unknown>,
): string[] {
  return requiredFields.filter((field) => {
    const v = submitted[field];
    if (typeof v === "number") return false;
    return String(v ?? "").trim() === "";
  });
}

