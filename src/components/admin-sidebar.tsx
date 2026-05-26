"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/services/auth-service";

const links = [
  { href: "/admin", label: "Panoramica" },
  { href: "/admin/users", label: "Utenti" },
  { href: "/admin/locandine", label: "Locandine" },
  { href: "/admin/content", label: "Contenuti" },
  { href: "/admin/qr", label: "Codici QR" },
  { href: "/admin/registrations", label: "Registrazioni" },
  { href: "/admin/delete", label: "Eliminazione" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="w-64 border-r border-neutral-200 bg-white p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Partecify Admin</h1>
        <p className="text-sm text-neutral-500">Pannello amministrativo</p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-red-50 text-red-700"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-8 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Esci
      </button>
    </aside>
  );
}