"use client";

import NextImage from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/services/auth-service";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Image,
  FileText,
  QrCode,
  ClipboardList,
  CircleDot,
  Trash2,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/admin", label: "Panoramica", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utenti", icon: Users },
  { href: "/admin/locandine", label: "Locandine", icon: Image },
  { href: "/admin/content", label: "Contenuti", icon: FileText },
  { href: "/admin/qr", label: "Codici QR", icon: QrCode },
  { href: "/admin/registrations", label: "Registrazioni", icon: ClipboardList },
  { href: "/admin/wheel", label: "Ruota", icon: CircleDot },
  { href: "/admin/delete", label: "Eliminazione", icon: Trash2 },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link href={href} onClick={onClick} className="w-full">
      <Button
        variant={active ? "secondary" : "ghost"}
        className={`w-full justify-start gap-3 text-sm font-medium ${
          active
            ? "bg-primary/10 text-primary hover:bg-primary/15"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-6">
        <NextImage
          src="/partecify-logo.png"
          alt="Partecify"
          width={100}
          height={100}
          className="h-10 w-auto object-contain"
          priority
        />
        <p className="text-xs text-muted-foreground mt-2">
          Pannello amministrativo
        </p>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-4 pt-2">
        <Separator className="mb-4" />
        <Button
          variant="outline"
          className="w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Esci
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
