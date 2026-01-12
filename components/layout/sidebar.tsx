"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  CalculatorIcon,
  BanknoteIcon,
  ArchiveIcon,
  HandCoinsIcon,
  PiggyBankIcon,
  UserRoundIcon,
  UtensilsIcon,
  ClipboardListIcon,
  WalletIcon,
  CornerDownLeftIcon,
  ChartBarIcon
} from 'lucide-react';


const MODULES = [

  {
    name: 'Ventas',
    href: '/pos',
    role: ['ADMIN', 'STAFF'],
    icon: CalculatorIcon
  },

  {
    name: 'Gestion',
    href: null,
    role: ["ADMIN"],
    icon: ClipboardListIcon,
    sub: [
      {
        name: 'Deudores',
        href: '/debtors',
        role: ['ADMIN', 'STAFF'],
        icon: BanknoteIcon
      },
      {
        name: 'Inventario',
        href: '/admin/inventory',
        role: ['ADMIN'],
        icon: ArchiveIcon
      },
      {
        name: 'Menu',
        href: '/admin/menu',
        role: ['ADMIN'],
        icon: UtensilsIcon
      },
      {
        name: 'CRM',
        href: '/admin/crm',
        role: ['ADMIN'],
        icon: UserRoundIcon
      },
    ]
  },
  {
    name: 'Finanzas',
    href: null,
    role: ["ADMIN"],
    icon: WalletIcon,
    sub: [
      {
        name: 'Salarios',
        href: '/admin/roster',
        role: ['ADMIN'],
        icon: HandCoinsIcon
      },
      {
        name: 'Ahorros',
        href: '/admin/savings',
        role: ['ADMIN'],
        icon: PiggyBankIcon
      },
            {
        name: 'Estadis.',
        href: '/admin/statistics',
        role: ['ADMIN'],
        icon: ChartBarIcon
      },
    ]
  }

];

import { Button } from '../ui/button';
import { useState } from 'react';

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [subMenu, setSubMenu] = useState("");

  // 1. Filter top-level modules by role
  const allowedModules = MODULES.filter(m => m.role.includes(userRole));

  // 2. Identify if we are inside a sub-menu
  const activeParent = allowedModules.find(m => m.name === subMenu);

  return (
    <div className='z-10 flex flex-col items-center w-20 h-screen bg-white shadow-sm font-rounded py-4'>
      
      {/* CASE: Main Menu */}
      {!activeParent && allowedModules.map((item, i) => {
        const isActive = pathname === item.href;
        
        // If it's a direct link (like Ventas)
        if (item.href) {
          return (
            <Link
              href={item.href}
              key={item.href}
              className={`flex my-1 flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer mb-4 transition-all shadow-md ${
                isActive ? 'bg-orange-400' : 'bg-gray-200'
              }`}
            >
              <item.icon size={25} className='mb-1' />
              <p className='text-[12px] font-medium'>{item.name}</p>
            </Link>
          );
        }

        return (
          <Button
            key={i}
            onClick={() => setSubMenu(item.name)}
            className="flex my-1 flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer mb-4"
          >
            <item.icon size={25} className='mb-1 ' />
            <p className='text-[12px] font-medium '>{item.name}</p>
          </Button>
        );
      })}

      {activeParent && (
        <>
          {activeParent.sub?.filter(subItem => subItem.role.includes(userRole)).map((subItem) => {
            const isActive = pathname === subItem.href;
            return (
              <Link
                href={subItem.href || "#"}
                key={subItem.name}
                className={`flex my-1 flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer mb-4 transition-all shadow-md ${
                  isActive ? 'bg-orange-400' : 'bg-gray-200'
                }`}
              >
                <subItem.icon size={25} className='mb-1' />
                <p className='text-[12px] font-medium'>{subItem.name}</p>
              </Link>
            );
          })}

          <Button 
            onClick={() => setSubMenu("")}
            className="flex mt-auto flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer mb-4 "
          >
            <CornerDownLeftIcon size={25} className='mb-1 ' />
            <p className='text-[12px] font-medium '>Volver</p>
          </Button>
        </>
      )}
    </div>
  );
}