"use client";

import type { VerificationReport } from "@/core/types";

export default function SummaryHeader({ report }: { report: VerificationReport | null }) {
  if (!report) {
    return (
      <div className="summary" aria-live="polite">
        <span className="trace">No verification run yet.</span>
      </div>
    );
  }
  const { total, supported, weak, unsupported } = report.summary;
  return (
    <div className="summary" aria-live="polite" aria-label="Groundedness summary">
      <span className="stat">
        <b>{total}</b> claims
      </span>
      <span className="stat ok">
        <b>{supported}</b> supported
      </span>
      <span className="stat warn">
        <b>{weak}</b> weak
      </span>
      <span className="stat bad">
        <b>{unsupported}</b> unsupported
      </span>
      <span className="trace">
        engine: {report.engine} · checked {report.checkedSourceIds.length} sources
      </span>
    </div>
  );
}
