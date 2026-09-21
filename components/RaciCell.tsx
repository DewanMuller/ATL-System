"use client";

import { useState, useTransition } from "react";
import { setRaciCell } from "@/app/actions/raci";
import { RACI_STYLES } from "@/lib/raci";

// A plain <form action={fn}> here would auto-reset every field back to its
// original default the moment the action resolves (React's built-in
// "reset form on successful action" behavior) — exactly what silently
// reverted a just-picked letter back to blank. Calling the Server Action
// directly from a controlled <select> sidesteps that reset entirely: the
// displayed value comes from local state we own, not from the DOM's native
// defaultValue/reset machinery.
export function RaciCell({
  objectiveId,
  userId,
  value: initialValue,
  title,
}: {
  objectiveId: string;
  userId: string;
  value: "" | "R" | "A" | "C" | "I";
  title?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [, startTransition] = useTransition();

  return (
    <select
      value={value}
      title={title}
      data-objective-id={objectiveId}
      data-user-id={userId}
      onChange={(e) => {
        const next = e.target.value as typeof value;
        setValue(next);
        const formData = new FormData();
        formData.set("objectiveId", objectiveId);
        formData.set("userId", userId);
        formData.set("role", next);
        startTransition(() => {
          setRaciCell(formData);
        });
      }}
      className={`w-12 cursor-pointer rounded-md border-0 px-1 py-1 text-center text-xs font-semibold ${RACI_STYLES[value]}`}
    >
      <option value=""> </option>
      <option value="R">R</option>
      <option value="A">A</option>
      <option value="C">C</option>
      <option value="I">I</option>
    </select>
  );
}
