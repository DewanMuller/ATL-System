"use client";

import { useState } from "react";
import { TextField } from "@/components/FormFields";

type ContextType = "OKR" | "WRAP" | "MRAP" | "QRAP" | "OTHER";

export function NextStepContextFields({
  objectives,
  weeklyCheckIns,
  monthlyReviews,
  quarterlyReviews,
}: {
  objectives: { id: string; title: string }[];
  weeklyCheckIns: { id: string; label: string }[];
  monthlyReviews: { id: string; label: string }[];
  quarterlyReviews: { id: string; label: string }[];
}) {
  const [contextType, setContextType] = useState<ContextType>("OKR");

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Context
        </span>
        <select
          name="contextType"
          value={contextType}
          onChange={(e) => setContextType(e.target.value as ContextType)}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="OKR">OKR</option>
          <option value="WRAP">Weekly Check-in (WRAP)</option>
          <option value="MRAP">Monthly Review (MRAP)</option>
          <option value="QRAP">Quarterly Review (QRAP)</option>
          <option value="OTHER">Other meeting</option>
        </select>
      </label>

      {contextType === "OKR" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Objective
          </span>
          <select
            name="objectiveId"
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <option value="">None</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {contextType === "WRAP" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Weekly check-in
          </span>
          <select
            name="weeklyCheckInId"
            required
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <option value="">Select a check-in</option>
            {weeklyCheckIns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {contextType === "MRAP" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Monthly review
          </span>
          <select
            name="monthlyReviewId"
            required
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <option value="">Select a month</option>
            {monthlyReviews.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {contextType === "QRAP" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Quarterly review
          </span>
          <select
            name="quarterlyReviewId"
            required
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <option value="">Select a quarter</option>
            {quarterlyReviews.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {contextType === "OTHER" && (
        <TextField
          label="Meeting name"
          name="otherContext"
          placeholder="e.g. Board meeting"
          required
        />
      )}
    </>
  );
}
