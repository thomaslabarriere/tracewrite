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
      <body>
        {children}
        {/* Vercel Web Analytics, loaded as the plain script rather than via
            @vercel/analytics: that package carries optional SvelteKit peers
            requiring Vite 8, which conflicts with the Vite 5 this project
            inherits from Vitest 2. This is the script the package injects. */}
        <script defer src="/_vercel/insights/script.js" />
      </body>
    </html>
  );
}
