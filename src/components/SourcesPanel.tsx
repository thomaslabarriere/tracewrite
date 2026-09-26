"use client";

import { useEffect, useRef } from "react";
import type { Source, EvidenceSpan } from "@/core/types";

interface Props {
  sources: Source[];
  activeEvidence: EvidenceSpan | null;
}

function HighlightedBody({
  body,
  span,
}: {
  body: string;
  span: EvidenceSpan | null;
}) {
  if (!span) return <>{body}</>;
  const before = body.slice(0, span.start);
  const mid = body.slice(span.start, span.end);
  const after = body.slice(span.end);
  return (
    <>
      {before}
      <mark className="evi">{mid}</mark>
      {after}
    </>
  );
}

export default function SourcesPanel({ sources, activeEvidence }: Props) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeEvidence && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Move focus to the target source card so keyboard/screen-reader users
      // land on the evidence, not just sighted users.
      activeRef.current.focus();
    }
  }, [activeEvidence]);

  return (
    <aside className="panel" aria-label="Source documents">
      <h2>Sources ({sources.length})</h2>
      <div className="sr-only" aria-live="polite">
        {activeEvidence
          ? `Evidence shown in source ${activeEvidence.sourceId}`
          : ""}
      </div>
      {sources.map((s) => {
        const isActive = activeEvidence?.sourceId === s.id;
        return (
          <div
            key={s.id}
            id={`source-${s.id}`}
            ref={isActive ? activeRef : null}
            tabIndex={-1}
            className={`source-card${isActive ? " active" : ""}`}
          >
            <div>
              <span className="sid">{s.id}</span>
              <span>{s.title}</span>
            </div>
            <div className="meta">
              {s.authors} · {s.year} · {s.specialty}
            </div>
            <div className="body">
              <HighlightedBody body={s.body} span={isActive ? activeEvidence : null} />
            </div>
          </div>
        );
      })}
    </aside>
  );
}
