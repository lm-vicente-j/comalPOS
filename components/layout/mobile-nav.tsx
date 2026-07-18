"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

import {
  CalculatorIcon,
  BanknoteIcon,
  BanknoteArrowDownIcon,
  MenuIcon,
  XIcon,
  ArchiveIcon,
  UtensilsIcon,
  UserRoundIcon,
  HandCoinsIcon,
  PiggyBankIcon,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  role: string[];
  icon: LucideIcon;
}

interface MenuGroup {
  title: string;
  items: NavItem[];
}

// The four primary destinations shown directly in the bottom bar.
const PRIMARY_ITEMS: NavItem[] = [
  { name: "POS", href: "/pos", role: ["ADMIN", "STAFF"], icon: CalculatorIcon },
  { name: "Egresos", href: "/expenses", role: ["ADMIN", "STAFF"], icon: BanknoteArrowDownIcon },
  { name: "Deudores", href: "/debtors", role: ["ADMIN", "STAFF"], icon: BanknoteIcon },
];

// Everything else lives inside the "Menu" bottom sheet, grouped by section.
const MENU_GROUPS: MenuGroup[] = [
  {
    title: "Gestión",
    items: [
      { name: "Inventario", href: "/admin/inventory", role: ["ADMIN"], icon: ArchiveIcon },
      { name: "Menú", href: "/admin/menu", role: ["ADMIN"], icon: UtensilsIcon },
      { name: "CRM", href: "/admin/crm", role: ["ADMIN"], icon: UserRoundIcon },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { name: "Salarios", href: "/admin/roster", role: ["ADMIN"], icon: HandCoinsIcon },
      { name: "Ahorros", href: "/admin/savings", role: ["ADMIN"], icon: PiggyBankIcon },
    ],
  },
];

export default function MobileNav({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const primary = PRIMARY_ITEMS.filter((item) => item.role.includes(userRole));

  const groups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.role.includes(userRole)),
  })).filter((group) => group.items.length > 0);

  // Highlight the "Menu" tab when the active route lives inside the sheet.
  const menuHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const isMenuActive = menuHrefs.some((href) => pathname === href);

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-stretch justify-around border-t border-gray-100 bg-white shadow-lg font-rounded lg:hidden">
      {primary.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
              isActive ? "text-orange-500" : "text-gray-500"
            )}
          >
            <item.icon size={22} />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </Link>
        );
      })}

      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Trigger
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 transition-colors outline-none",
            menuOpen || isMenuActive ? "text-orange-500" : "text-gray-500"
          )}
        >
          <MenuIcon size={22} />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </DialogPrimitive.Trigger>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 lg:hidden" />
          <DialogPrimitive.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-gray-100 bg-white pb-8 shadow-lg font-rounded outline-none lg:hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300"
            )}
          >
            {/* Grab handle */}
            <div className="sticky top-0 flex flex-col items-center bg-white pt-3 pb-2">
              <div className="h-1.5 w-10 rounded-full bg-gray-300" />
              <div className="mt-3 flex w-full items-center justify-between px-5">
                <DialogPrimitive.Title className="text-lg font-bold text-[#241712]">
                  Menú
                </DialogPrimitive.Title>
                <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 outline-none">
                  <XIcon size={18} />
                  <span className="sr-only">Cerrar</span>
                </DialogPrimitive.Close>
              </div>
            </div>

            <DialogPrimitive.Description className="sr-only">
              Opciones de navegación adicionales
            </DialogPrimitive.Description>

            <div className="px-5 pt-2">
              {groups.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  No hay más opciones disponibles.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.title} className="mb-6 last:mb-0">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center shadow-sm transition-all",
                              isActive ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-700"
                            )}
                          >
                            <item.icon size={22} />
                            <span className="text-[11px] font-medium leading-tight">
                              {item.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </nav>
  );
}
