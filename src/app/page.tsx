"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TipTapEditor } from "@tiptap/react";
import Editor from "@/components/Editor";
import SourcesPanel from "@/components/SourcesPanel";
import VerificationTable from "@/components/VerificationTable";
import SummaryHeader from "@/components/SummaryHeader";
import type { EvidenceSpan, Source, VerificationReport } from "@/core/types";

const INITIAL = `<p>Adjuvant zolgetinib reduced the risk of recurrence in resected stage III melanoma, with 3-year recurrence-free survival of 62% versus 48% with placebo (hazard ratio 0.61). In this indication, zolgetinib also eliminated all adverse events, which is an excellent tolerability profile.</p>`;

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [text, setText] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceSpan | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<TipTapEditor | null>(null);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => {
        setSources(d.sources);
      })
      .catch(() => {});
  }, []);

  const verify = useCallback(async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: text }),
      });
      if (!res.ok) throw new Error(`Verify failed (HTTP ${res.status})`);
      const data = await res.json();
      setReport(data);
    } catch {
      setError("Could not verify the draft. Check the app is running, then retry.");
    } finally {
      setVerifying(false);
    }
  }, [text]);

  const draft = useCallback(async () => {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceIds: sources.slice(0, 3).map((s) => s.id) }),
      });
      if (!res.ok) throw new Error(`Draft failed (HTTP ${res.status})`);
      const d = await res.json();
      const editor = editorRef.current;
      if (editor && d.paragraph) {
        editor.chain().focus().insertContent(`<p>${d.paragraph}</p>`).run();
      }
    } catch {
      setError("Could not draft from sources. Check the app is running, then retry.");
    } finally {
      setDrafting(false);
    }
  }, [sources]);

  const retry = useCallback(() => {
    setError(null);
    void verify();
  }, [verify]);

  const unsupported = report?.verifications.filter((v) => v.status !== "supported") ?? [];

  return (
    <main>
      <div className="banner" role="note">
        Demo with synthetic data only (invented oncology/dermatology abstracts).
        Not medical advice. The verifier <b>detects insufficiently-supported
        claims</b>; it does not guarantee correctness.
      </div>

      <header className="app-header">
        <h1>TraceWrite</h1>
        <span className="sub">
          grounded scientific writing · provenance for every claim
        </span>
      </header>

      <div className="layout">
        <SourcesPanel sources={sources} activeEvidence={activeEvidence} />

        <section className="center">
          <div className="toolbar">
            <button
              className="primary"
              onClick={verify}
              disabled={verifying}
              aria-busy={verifying}
            >
              {verifying ? "Verifying…" : "Verify draft"}
            </button>
            <button
              onClick={draft}
              disabled={drafting || sources.length === 0}
              aria-busy={drafting}
            >
              {drafting ? "Drafting…" : "Draft from sources"}
            </button>
            <span className="trace">
              How it works: 1) edit the draft, or use "Draft from sources"; 2) "Verify
              draft" checks every claim against the sources and flags anything not supported.
            </span>
          </div>

          {error && (
            <div className="banner" role="alert">
              {error}{" "}
              <button className="src-link" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          <Editor
            initialContent={INITIAL}
            onTextChange={setText}
            onReady={(e) => {
              editorRef.current = e;
            }}
          />

          <SummaryHeader report={report} />

          {unsupported.length > 0 && (
            <details className="trace-panel" open>
              <summary>
                {unsupported.length} claim(s) surfaced for review (weak or
                unsupported)
              </summary>
              <ul>
                {unsupported.map((v) => (
                  <li key={v.claim.id}>
                    <span className={`badge ${v.status}`}>{v.status}</span>{" "}
                    {v.claim.text} <span className="trace">({v.reason})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <VerificationTable
            verifications={report?.verifications ?? []}
            onPickEvidence={setActiveEvidence}
          />

          {report && (
            <details className="trace-panel">
              <summary>How each claim was checked</summary>
              <div className="trace">
                Ran at {report.ranAt}. Each claim was scored against all{" "}
                {report.checkedSourceIds.length} sources (
                {report.checkedSourceIds.join(", ")}). Expand a row's source to
                see the matched span; per-source scores are in the Status column
                score and drive the ✓ / ⚠️ / ✗ classification.
              </div>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
