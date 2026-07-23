"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { canAccessRoute } from '@/lib/permissions';

import {
  CalculatorIcon,
  ArchiveIcon,
  BrainCircuitIcon,
  UserRoundIcon,
  UtensilsIcon,
  BanknoteIcon,
  WalletIcon,
  CornerDownLeftIcon,
  ChartBarIcon,
  LineChartIcon,
  TargetIcon,
  ClipboardListIcon,
  CpuIcon, 
  PiggyBankIcon, 
  HandCoinsIcon,
  LucideIcon,
  BanknoteArrowDownIcon,
  PackageCheckIcon,
  SettingsIcon
} from 'lucide-react';

interface SubModule {
  name: string;
  href: string | null;
  icon: LucideIcon;
  flag?: string;
}

interface NavModule {
  name: string;
  href: string | null;
  icon: LucideIcon;
  sub?: SubModule[];
  flag?: string;
}

// Visibility is derived from the central route permissions (lib/permissions.ts):
// items with an href are shown when the role can access that route, and parent
// modules are shown when at least one of their sub-items is visible.
const MODULES: NavModule[] = [
  {
    name: 'Ventas',
    href: '/pos',
    icon: CalculatorIcon
  },
  {
    name: 'Gestión',
    href: null,
    icon: ClipboardListIcon,
    sub: [
      { name: 'Deudores', href: '/debtors', icon: BanknoteIcon },
      { name: 'Inventario', href: '/admin/inventory', icon: ArchiveIcon },
      { name: 'Menu', href: '/admin/menu', icon: UtensilsIcon },
      { name: 'CRM', href: '/admin/crm', icon: UserRoundIcon },
    ]
  },
  {
    name: 'Optimiza',
    href: null,
    icon: BrainCircuitIcon,
    sub: [
      { name: 'Motor de Análisis', href: '/admin/analysis/engine', icon: CpuIcon },
      { name: 'Predicciones', href: '/admin/analysis/predictions', icon: LineChartIcon },
      { name: 'Validación', href: '/admin/analysis/accuracy', icon: TargetIcon },
      { name: 'Suministro Sugerido', href: '/admin/analysis/supply', icon: PackageCheckIcon },
    ],
    flag: "BETA"
  },
  {
    name: 'Finanzas',
    href: null,
    icon: WalletIcon,
    sub: [
      { name: 'Salarios', href: '/admin/roster', icon: HandCoinsIcon },
      { name: 'Ahorros', href: '/admin/savings', icon: PiggyBankIcon },
      { name: 'Egresos', href: '/expenses', icon: BanknoteArrowDownIcon },
      { name: 'Estadísticas', href: '/admin/statistics', icon: ChartBarIcon, flag: "BETA" },
    ]
  },
  {
    name: 'Ajustes',
    href: '/admin/settings',
    icon: SettingsIcon
  }
];

import { Button } from '../ui/button';

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const subMenu = useStore((state) => state.subMenu);
  const setSubMenu = useStore((state) => state.setSubMenu);

  const canSee = (item: { href: string | null; sub?: SubModule[] }): boolean => {
    if (item.href) return canAccessRoute(userRole, item.href);
    return item.sub?.some(s => s.href && canAccessRoute(userRole, s.href)) ?? false;
  };

  const allowedModules = MODULES.filter(canSee);
  const activeParent = allowedModules.find(m => m.name === subMenu);

  return (
    // Desktop-only vertical sidebar. On mobile the bottom nav (MobileNav) is used instead.
    <div className='z-50 hidden lg:flex lg:flex-col items-center lg:justify-start lg:w-25 lg:h-screen bg-white lg:shadow-sm font-rounded lg:py-4 lg:static lg:border-r border-gray-100'>

      {!activeParent && allowedModules.map((item, i) => {
        const isActive = pathname === item.href;

        if (item.href) {
          return (
            <Link
              href={item.href}
              key={item.href}
              className={`flex flex-col items-center justify-center w-16 lg:w-18 h-14 lg:h-18 rounded-xl cursor-pointer lg:mb-4 transition-all shadow-md ${isActive ? 'bg-orange-400' : 'bg-gray-200'}`}
            >
              <item.icon size={20} className='lg:size-6 mb-1' />
              <p className='text-[8px] lg:text-[10px] leading-tight font-medium text-center wrap-break-word w-full '>{item.name}</p>
            </Link>
          );
        }

        if (item.flag == "BETA") return null;

        return (
          <Button
            key={i}
            onClick={() => setSubMenu(item.name)}
            className="flex flex-col items-center justify-center w-16 lg:w-18 h-14 lg:h-18 rounded-xl cursor-pointer lg:mb-4"
          >
            <item.icon size={20} className='lg:size-6 mb-1 ' />
            <p className='text-[8px] lg:text-[10px] leading-tight font-medium text-center wrap-break-word w-full '>{item.name}</p>
          </Button>
        );
      })}

      {activeParent && (
        <>
          {activeParent.sub?.filter(subItem => subItem.href && canAccessRoute(userRole, subItem.href)).map((subItem) => {
            const isActive = pathname === subItem.href;
            if (subItem.flag == "BETA") return null;

            return (
              <Link
                href={subItem.href || "#"}
                key={subItem.name}
                className={`text-center flex flex-col items-center justify-center w-16 h-14 lg:w-16 lg:h-16 rounded-xl cursor-pointer lg:mb-4 transition-all shadow-md ${isActive ? 'bg-orange-400' : 'bg-gray-200'}`}
              >
                <subItem.icon size={20} className='lg:size-6 mb-1' />
                <p className='text-[8px] lg:text-[10px] leading-tight font-medium text-center wrap-break-word w-full '>{subItem.name}</p>
              </Link>
            );
          })}

          <Button
            onClick={() => setSubMenu("")}
            className="flex flex-col items-center justify-center w-16 lg:w-18 h-14 lg:h-18 rounded-xl cursor-pointer"
          >
            <CornerDownLeftIcon size={20} className='lg:size-6 mb-1' />
            <p className='text-[8px] lg:text-[10px] leading-tight font-medium text-center wrap-break-word w-full px-1'>Volver</p>
          </Button>
        </>
      )}
    </div>
  );
}