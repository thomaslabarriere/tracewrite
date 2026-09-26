import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraceWrite: grounded scientific writing (demo)",
  description:
    "AI-assisted scientific-writing editor with per-claim provenance and a groundedness verification table. Synthetic demo data; not medical advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
