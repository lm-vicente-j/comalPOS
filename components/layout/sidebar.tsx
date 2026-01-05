"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { 
    CalculatorIcon,
    BanknoteIcon,
    ArchiveIcon,
    HandCoinsIcon,
    PiggyBankIcon
 } from 'lucide-react';


const MODULES = [

    {
        name: 'Ventas',
        href: '/pos',
        role: ['admin', 'staff'],
        icon: CalculatorIcon
    },

    { 
    name: 'Deudores', 
    href: '/debtors', 
    role: ['admin', 'staff'], 
    icon: BanknoteIcon 
  },
  { 
    name: 'Inventario', 
    href: '/admin/inventory', 
    role: ['admin'], 
    icon: ArchiveIcon 
  },
  { 
    name: 'Salarios', 
    href: '/admin/roster', 
    role: ['admin'], 
    icon: HandCoinsIcon 
  },
  { 
    name: 'Ahorros', 
    href: '/admin/savings', 
    role: ['admin'], 
    icon: PiggyBankIcon 
  },
];



export default function Sidebar({ userRole }: { userRole: string }){

    const pathname = usePathname();

    const allowedModules = MODULES.filter(m => m.role.includes(userRole));


  return(
    <div className='z-10 flex flex-col items-center w-20 h-screen bg-white shadow-sm font-rounded py-4'>

        {
            allowedModules.map((item) => {
                const isActive = pathname === item.href;
                return(

                <Link href={item.href} key={item.href} className={`flex my-1 flex-col items-center justify-center  w-16 h-16 rounded-xl cursor-pointer mb-4 transition-all shadow-md ${
                    isActive
                    ? 'bg-orange-400'
                    : 'bg-gray-200'
                }`}>
                    <item.icon size={25} className='mb-1'/>
                    <p className='text-[12px] font-medium ' >{item.name}</p>
                </Link> 

                );
            })
        }



    </div>
  );
}
