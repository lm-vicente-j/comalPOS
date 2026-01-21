    "use client";
    import Link from 'next/link';
    import { usePathname } from 'next/navigation';

    import {
      CalculatorIcon,
      PackageCheckIcon,
      ArchiveIcon,
      TruckIcon,
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
      CpuIcon,PiggyBankIcon,HandCoinsIcon,
      LucideIcon
    } from 'lucide-react';

    interface SubModule{ 
      name: string;
      href: string | null;
      role: string[]; 
      icon: LucideIcon;
      flag?: string;
    }

    interface NavModule{
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
          { name: 'Proveedores', href: '/admin/suppliers', role: ['ADMIN'], icon: TruckIcon,flag: "BETA" },
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
          { name: 'Motor de Análisis', href: '/admin/analysis/engine', role: ['ADMIN'], icon: CpuIcon }, // Interfaz para el motor
          { name: 'Predicciones', href: '/admin/analysis/predictions', role: ['ADMIN'], icon: LineChartIcon }, // Resultados del modelo
          { name: 'Validación', href: '/admin/analysis/accuracy', role: ['ADMIN'], icon: TargetIcon }, // Comparativa Real vs Predicción
          { name: 'Suministro Sugerido', href: '/admin/analysis/supply', role: ['ADMIN'], icon: PackageCheckIcon }, // Aplicación práctica
        ],
        flag: "BETA"
        
      },
      {
        name: 'Finanzas',
        href: null,
        role: ["ADMIN"],
        icon: WalletIcon,
        sub: [
          { name: 'Salarios', href: '/admin/roster', role: ['ADMIN'], icon: HandCoinsIcon },
          { name: 'Ahorros', href: '/admin/savings', role: ['ADMIN'], icon: PiggyBankIcon },
          { name: 'Estadísticas', href: '/admin/statistics', role: ['ADMIN'], icon: ChartBarIcon, flag: "BETA" },
        ]
      }
    ];

    import { Button } from '../ui/button';
    import { useState } from 'react';

    export default function Sidebar({ userRole }: { userRole: string }) {
      const pathname = usePathname();
      const [subMenu, setSubMenu] = useState("");

      const allowedModules = MODULES.filter(m => m.role.includes(userRole));

      const activeParent = allowedModules.find(m => m.name === subMenu);

      return (
        <div className='z-10 flex flex-col items-center w-25   h-screen bg-white shadow-sm font-rounded py-4'>
          
          {!activeParent && allowedModules.map((item, i) => {
            const isActive = pathname === item.href;
            
            if (item.href) {
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={`flex my-1 flex-col items-center justify-center w-18 h-18 rounded-xl cursor-pointer mb-4 transition-all shadow-md ${
                    isActive ? 'bg-orange-400' : 'bg-gray-200'
                  }`}
                >
                  <item.icon size={25} className='mb-1' />
                  <p className='text-[10px] leading-tight font-medium text-center wrap-break-word w-full '>{item.name}</p>
                </Link>
              );
            }

            if(item.flag == "BETA") return null;

            return (
              <Button
                key={i}
                onClick={() => setSubMenu(item.name)}
                className="flex my-1 flex-col items-center justify-center w-18 h-18 rounded-xl cursor-pointer mb-4"
              >
                <item.icon size={25} className='mb-1 ' />
                <p className='text-[10px] leading-tight font-medium text-center wrap-break-word w-full '>{item.name}</p>
              </Button>
            );
          })}

          {activeParent && (
            <>
              {activeParent.sub?.filter(subItem => subItem.role.includes(userRole)).map((subItem) => {
                const isActive = pathname === subItem.href;
              if(subItem.flag == "BETA") return null;
              
                return (
                  <Link
                    href={subItem.href || "#"}
                    key={subItem.name}
                    className={`text-center text-ellipsis flex my-1 flex-col items-center justify-center w-16 h-16 rounded-xl cursor-pointer mb-4 transition-all shadow-md ${
                      isActive ? 'bg-orange-400' : 'bg-gray-200'
                    }`}
                  >
                    <subItem.icon size={25} className='mb-1' />
                    <p className='text-[10px] leading-tight font-medium text-center wrap-break-word w-full '>{subItem.name}</p>
                  </Link>
                );
              })}

              <Button 
                onClick={() => setSubMenu("")}
                className="flex flex-col items-center justify-center w-18 h-18 rounded-xl cursor-pointer "
              >
                <CornerDownLeftIcon size={25} className='mb-1 ' />
                <p className='text-[10px] leading-tight font-medium text-center wrap-break-word w-full px-1'>Volver</p>
              </Button>
            </>
          )}
        </div>
      );
    }