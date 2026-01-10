"use client"
import { logout } from '@/lib/actions/auth_action';

import Image from 'next/image';

import { UserIcon } from 'lucide-react';
import { LogOutIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';

import { ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { useState } from 'react';
import { GetAllStaffUsers } from '@/lib/actions/users';

export default function Topbar({ userName }: { userName: string }) {
  const [staffList, setStaffList] = useState<{ id: string, name: string | null }[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const users = await GetAllStaffUsers();
      setStaffList(users);
    }
    loadUsers();
  }, []);

  return (
    <div className='z-20 flex flex-row justify-between h-20 w-screen bg-white font-rounded shadow-sm'>
      <div className='flex flex-row text-4xl font-extrabold text-gray-900 '>
        <Image className='m-5 w-10 h-10' width="50" height="50" src="/favicon.ico" alt='Tacos al comal logo' />
        <h1 className='flex items-center justify-center '>Comal</h1>
      </div>
      <div className='flex items-center justify-around w-fit cursor-pointer m-5'>
        <DropdownMenu >
          <DropdownMenuTrigger className='flex gap-2 w-fit h-10 items-center justify-around bg-white cursor-pointer outline-0 '>
            <div className='flex items-center justify-center rounded-lg w-7 h-7 outline-0 bg-amber-300'>
              <UserIcon className='w-5 h-5' />
            </div>
            <div className='flex items-center justify-center'>
              {userName} <ChevronDown className='m-1' />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='z-20 flex flex-col w-[--radix-dropdown-menu-trigger-width] mt-2 bg-white shadow-lg rounded-md border border-gray-100 p-1'>
            {staffList.map((usr, index) => {
              if (usr.name === userName) return;
              return (

                <DropdownMenuItem key={usr.id} className='flex items-center justify-start gap-3 px-2 outline-0 flex-row h-10 hover:bg-gray-100 rounded-sm cursor-pointer '>
                  <div className='flex items-center justify-center rounded-lg w-6 h-6 outline-0 bg-amber-300'>
                    <UserIcon className='w-4 h-4' />
                  </div>
                  <div className='truncate text-sm'>
                    {usr.name}
                  </div>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuItem className='flex items-center justify-start gap-3 px-2 outline-0 flex-row h-10 hover:bg-gray-100 rounded-sm cursor-pointer '>
              <div className='flex items-center justify-center rounded-lg w-6 h-6 outline-0 bg-amber-300'>
                <UserIcon className='w-4 h-4' />
              </div>
              <div className='truncate text-sm'>
                Admin
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className='flex items-center justify-start gap-3 px-2 flex-row outline-0 h-10 hover:bg-gray-100 rounded-sm cursor-pointer'>
              <div className='flex items-center justify-center w-6 h-6'>
                <LogOutIcon className='w-4 h-4' />
              </div>
              <div className='truncate text-sm'>
                Logout
              </div>
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  );
}
