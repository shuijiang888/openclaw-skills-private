import type { DemoRole } from "@/lib/approval";

export function canViewSeedPilot(role: DemoRole): boolean {
  return role === "SALES_MANAGER" || role === "VP";
}

export function canUpdateSeedPilotProgress(role: DemoRole): boolean {
  return role === "SALES_MANAGER" || role === "VP";
}

export function canAssignSeedPilotOwner(role: DemoRole): boolean {
  return role === "VP";
}

export function canEditSeedPilotScoring(role: DemoRole): boolean {
  return role === "VP";
}
