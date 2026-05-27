import AuthGuard from "@/components/auth-guard";
import AdminSidebar from "@/components/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
