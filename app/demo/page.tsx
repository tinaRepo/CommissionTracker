"use client";

import dynamic from "next/dynamic";

const DemoApp = dynamic(() => import("@/components/DemoApp"), { ssr: false });

export default function DemoPage() {
  return <DemoApp />;
}
