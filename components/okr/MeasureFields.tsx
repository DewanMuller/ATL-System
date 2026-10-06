"use client";

import { useState } from "react";
import type { MeasureType } from "@prisma/client";
import { TextField } from "@/components/FormFields";

// Shared by InitiativeForm and KeyResultForm. Target/starting value/unit
// only make sense for NUMERIC — showing them for BINARY or MANUAL just
// confuses whoever's filling the form out, so they're hidden outright
// rather than disabled. A controlled select (not defaultValue) is what
// makes the show/hide instant without a server round trip.
export function MeasureFields({
  defaultValues,
}: {
  defaultValues?: {
    measureType?: MeasureType;
    targetValue?: number | null;
    startValue?: number | null;
    unit?: string | null;
  };
}) {
  const [measureType, setMeasureType] = useState<MeasureType>(defaultValues?.measureType ?? "MANUAL");

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Measured as
        </span>
        <select
          name="measureType"
          value={measureType}
          onChange={(e) => setMeasureType(e.target.value as MeasureType)}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <option value="MANUAL">Manual %</option>
          <option value="BINARY">Done / Not done</option>
          <option value="NUMERIC">Numeric target</option>
        </select>
      </label>
      {measureType === "NUMERIC" && (
        <>
          <TextField
            label="Target"
            name="targetValue"
            type="number"
            step="any"
            defaultValue={defaultValues?.targetValue ?? undefined}
          />
          <TextField
            label="Starting value (optional)"
            name="startValue"
            type="number"
            step="any"
            defaultValue={defaultValues?.startValue ?? undefined}
          />
          <TextField
            label="Unit (optional, e.g. tons)"
            name="unit"
            defaultValue={defaultValues?.unit ?? undefined}
          />
        </>
      )}
    </>
  );
}
