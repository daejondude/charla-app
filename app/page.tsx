"use client";

import dynamic from "next/dynamic";

// Progress (streak, XP, level) lives in localStorage, so the app renders on
// the client only — server HTML could never match the learner's real stats.
const CharlaApp = dynamic(
  () => import("@/components/CharlaApp").then((module) => module.CharlaApp),
  { ssr: false, loading: () => <div className="flex-1 bg-background" /> }
);

export default function Page() {
  return <CharlaApp />;
}
