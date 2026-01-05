
import { logout } from '@/lib/actions/auth_action';

import Image from 'next/image';

import { UserIcon } from 'lucide-react';
import { LogOutIcon } from 'lucide-react';

import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger, } from '@radix-ui/react-dropdown-menu';

import { ChevronDown } from 'lucide-react';

export default function Topbar({ userName }: { userName: string }){


  return(
    <div className='z-20 flex flex-row justify-between h-20 w-screen bg-white font-rounded shadow-sm'>
        <div className='flex flex-row text-4xl font-extrabold text-gray-900 '>
          <Image className='m-5 w-10 h-10' width="50" height="50" src="/favicon.ico" alt='Tacos al comal logo' />
          <h1 className='flex items-center justify-center '>Comal</h1>
        </div>
        <div className='flex items-center justify-around w-30 cursor-pointer m-5'>
          <DropdownMenu >
            <DropdownMenuTrigger className='flex w-30 h-10 items-center justify-around bg-white cursor-pointer outline-0 '>
              <div className='flex items-center justify-center rounded-lg w-7 h-7 outline-0 bg-amber-300'>
                <UserIcon className='w-5 h-5' />
              </div>
              <div className='flex items-center justify-center'>
                {userName} <ChevronDown className='m-1'/>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='z-20 flex flex-col w-30 '>
              <DropdownMenuItem className='flex  items-center justify-around  outline-0 flex-row w-30 h-10 hover:bg-gray-100 bg-white '>
                <div className='flex items-center justify-center rounded-lg w-7 h-7 outline-0 bg-amber-300'>
                  <UserIcon className='w-5 h-5' />
                </div>
                <div>
                  user 1
                </div>
              </DropdownMenuItem>
                <DropdownMenuItem className='flex  items-center justify-around  outline-0 flex-row w-30 h-10 hover:bg-gray-100 bg-white'>
                <div className='flex items-center justify-center rounded-lg w-7 h-7  bg-amber-300'>
                  <UserIcon className='w-5 h-5' />
                </div>
                <div>
                  user 2
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={logout } className='flex  items-center justify-around flex-row outline-0 w-30 h-10 hover:bg-gray-100 bg-white'>
                <div className='flex items-center justify-center w-5 h-5'>
                  <LogOutIcon />
                </div>
                <div>
                  Logout
                </div>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

    </div>
  );
}
