import { requireAdmin } from "@/lib/auth";
import AdminShell from "@/components/admin/admin-shell";

// Server-side gate: only admin / staff reach any console page. Every server action
// checks again on its own (defence in depth).
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AdminShell base="/admin" user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </AdminShell>
  );
}
