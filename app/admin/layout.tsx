import type { ReactNode } from "react";
import AdminMfaGate from "@/components/AdminMfaGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminMfaGate>{children}</AdminMfaGate>;
}
