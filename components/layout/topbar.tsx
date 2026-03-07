"use client"
import { logout } from '@/lib/actions/auth_action';
import { useActionState } from "react";

import Image from 'next/image';

import { User, UserIcon } from 'lucide-react';
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { login } from "@/lib/actions/auth_action";

function DialogUserSwitch({ username }: { username: string }) {
  const [pin, setPin] = useState("");
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className='flex items-center justify-start gap-3 px-2 outline-0 flex-row h-10 hover:bg-gray-100 rounded-sm cursor-pointer '>
          <div className='flex items-center justify-center rounded-lg w-6 h-6 outline-0 bg-amber-300'>
            <UserIcon className='w-4 h-4' />
          </div>
          <div className='truncate text-sm'>{username}</div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogTitle>
          Login | {username}
        </DialogTitle>
        <form action={formAction} >

          <div className="flex gap-2  flex-col flex-1 items-center justify-center">

            {username != "ADMIN" &&
              <div className="flex flex-1 flex-row items-center gap-3 justify-center">
                <input type="hidden" name="name" value={username} />
                <label className="text-sm font-medium text-gray-700">PIN</label>
                <input type="hidden" name="pin" value={pin} />
                <InputOTP
                  maxLength={4} value={pin} onChange={(v) => { setPin(v) }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            }
            {username == "ADMIN" &&
              <>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

              </>
            }

          </div>
          <button
            type="submit"
            className="mt-5 w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Entrar al Sistema
          </button>
        </form>

      </DialogContent>
    </Dialog>
  );
}

export default function Topbar({ userName }: { userName: string }) {
  const [staffList, setStaffList] = useState<{ id: number, name: string | null }[]>([]);

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

                <DropdownMenuItem onSelect={(e) => e.preventDefault()} key={usr.id} className='flex items-center justify-start gap-3 px-2 outline-0 flex-row h-10 hover:bg-gray-100 rounded-sm cursor-pointer '>

                  <DialogUserSwitch username={usr.name == null ? "" : usr.name} />

                </DropdownMenuItem>
              );
            })}

            <DropdownMenuItem key={"admin-switch"} onSelect={(e) => e.preventDefault()} className='flex items-center justify-start gap-3 px-2 outline-0 flex-row h-10 hover:bg-gray-100 rounded-sm cursor-pointer '>
              <DialogUserSwitch username={"ADMIN"} />
            </DropdownMenuItem>
            <DropdownMenuItem key={"logout-btn"}  onClick={logout} className='flex items-center justify-start gap-3 px-2 flex-row outline-0 h-10 hover:bg-gray-100 rounded-sm cursor-pointer'>
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
