"use client";

import { dietToText, downloadText, routineToText } from "@/lib/exportFiles";
import type { Diet, Routine } from "@/lib/types";
import { SecondaryButton } from "./ui";

export default function DownloadBar(props: { kind: "routine"; data: Routine } | { kind: "diet"; data: Diet }) {
  const label = props.kind === "routine" ? "루틴" : "식단";
  const download = (format: "md" | "txt") => {
    const text = props.kind === "routine" ? routineToText(props.data) : dietToText(props.data);
    downloadText(props.kind, props.data.createdAt, text, format);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <SecondaryButton className="text-sm" onClick={() => download("md")}>
        {label} 내려받기 .md
      </SecondaryButton>
      <SecondaryButton className="text-sm" onClick={() => download("txt")}>
        {label} 내려받기 .txt
      </SecondaryButton>
    </div>
  );
}
