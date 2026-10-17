"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DemoApp = dynamic(() => import("@/components/DemoApp"), { ssr: false });

export default function DemoPage() {
  const [returnPath, setReturnPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("failed to check demo return destination:", error);
        setReturnPath("/login");
        return;
      }
      setReturnPath(data.session ? "/pricing" : "/login");
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <DemoApp
      returnPath={returnPath}
      onBack={() => {
        if (returnPath) window.location.href = returnPath;
      }}
    />
  );
}
