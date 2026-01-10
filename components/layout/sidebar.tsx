"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { 
    CalculatorIcon,
    BanknoteIcon,
    ArchiveIcon,
    HandCoinsIcon,
    PiggyBankIcon,
    UserRoundIcon
 } from 'lucide-react';


const MODULES = [

    {
        name: 'Ventas',
        href: '/pos',
        role: ['ADMIN', 'STAFF'],
        icon: CalculatorIcon
    },

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
    name: 'CRM', 
    href: '/admin/crm', 
    role: ['ADMIN'], 
    icon:     UserRoundIcon 
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
