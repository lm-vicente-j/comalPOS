"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

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
  PackageCheckIcon
} from 'lucide-react';

interface SubModule {
  name: string;
  href: string | null;
  role: string[];
  icon: LucideIcon;
  flag?: string;
}

interface NavModule {
  name: string;
  href: string | null;
  role: string[];
  icon: LucideIcon;
  sub?: SubModule[];
  flag?: string;
}

const MODULES: NavModule[] = [
  {
    name: 'Ventas',
    href: '/pos',
    role: ['ADMIN', 'STAFF'],
    icon: CalculatorIcon
  },
  {
    name: 'Gestión',
    href: null,
    role: ["ADMIN"],
    icon: ClipboardListIcon,
    sub: [
      { name: 'Deudores', href: '/debtors', role: ['ADMIN', 'STAFF'], icon: BanknoteIcon },
      { name: 'Inventario', href: '/admin/inventory', role: ['ADMIN'], icon: ArchiveIcon },
      { name: 'Menu', href: '/admin/menu', role: ['ADMIN'], icon: UtensilsIcon },
      { name: 'CRM', href: '/admin/crm', role: ['ADMIN'], icon: UserRoundIcon },
    ]
  },
  {
    name: 'Optimiza',
    href: null,
    role: ["ADMIN"],
    icon: BrainCircuitIcon,
    sub: [
      { name: 'Motor de Análisis', href: '/admin/analysis/engine', role: ['ADMIN'], icon: CpuIcon },
      { name: 'Predicciones', href: '/admin/analysis/predictions', role: ['ADMIN'], icon: LineChartIcon },
      { name: 'Validación', href: '/admin/analysis/accuracy', role: ['ADMIN'], icon: TargetIcon },
      { name: 'Suministro Sugerido', href: '/admin/analysis/supply', role: ['ADMIN'], icon: PackageCheckIcon },
    ],
    flag: "BETA"
  },
  {
    name: 'Finanzas',
    href: null,
    role: ["ADMIN", "STAFF"],
    icon: WalletIcon,
    sub: [
      { name: 'Salarios', href: '/admin/roster', role: ['ADMIN'], icon: HandCoinsIcon },
      { name: 'Ahorros', href: '/admin/savings', role: ['ADMIN'], icon: PiggyBankIcon },
      { name: 'Egresos', href: '/expenses', role: ['ADMIN', 'STAFF'], icon: BanknoteArrowDownIcon },
      { name: 'Estadísticas', href: '/admin/statistics', role: ['ADMIN'], icon: ChartBarIcon, flag: "BETA" },
    ]
  }
];

import { Button } from '../ui/button';

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const subMenu = useStore((state) => state.subMenu);
  const setSubMenu = useStore((state) => state.setSubMenu);

  const allowedModules = MODULES.filter(m => m.role.includes(userRole));
  const activeParent = allowedModules.find(m => m.name === subMenu);

  return (
    // Changed classes: fixed bottom-0 for mobile, static for desktop
    <div className='z-50 flex flex-row lg:flex-col items-center justify-around lg:justify-start w-full lg:w-25 h-16 lg:h-screen bg-white shadow-lg lg:shadow-sm font-rounded py-2 lg:py-4 fixed lg:static bottom-0 left-0 border-t lg:border-t-0 lg:border-r border-gray-100'>

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
          {activeParent.sub?.filter(subItem => subItem.role.includes(userRole)).map((subItem) => {
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