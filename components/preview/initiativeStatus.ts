import { ragForPercent, type Rag } from "./colors";

export type StatusInitiative = {
  dueDate: Date;
  outcomePercent: number | null;
};

export function statusLabel(i: StatusInitiative, now: Date): string {
  if (i.outcomePercent != null && i.outcomePercent >= 100) return "Completed";
  if (i.dueDate < now) return "Overdue";
  if (i.outcomePercent == null) return "Not Started";
  return "In Progress";
}

export function ragFor(i: StatusInitiative, now: Date): Rag | "NOT_STARTED" {
  if (i.outcomePercent != null && i.outcomePercent >= 100) return "GREEN";
  if (i.dueDate < now) return "RED";
  if (i.outcomePercent == null) return "NOT_STARTED";
  return ragForPercent(i.outcomePercent);
}

export function ragLabel(status: Rag | "NOT_STARTED") {
  if (status === "NOT_STARTED") return "Not Started";
  return status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red";
}
