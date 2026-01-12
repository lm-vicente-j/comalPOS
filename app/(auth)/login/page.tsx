"use client"
import { useActionState } from "react";

import { login } from "@/lib/actions/auth_action";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { GetAllStaffUsers } from "@/lib/actions/users";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useState } from "react";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { useEffect } from "react";



export default function LoginPage() {

  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("");
  const [staffList, setStaffList] = useState<{ id: number, name: string | null }[]>([]);
  const [state, formAction, isPending] = useActionState(login, null);



  useEffect(() => {
    async function loadUsers() {
      
      const users = await GetAllStaffUsers();
    
      setStaffList(users);
    
    }
    loadUsers();
  }, []);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-rounded">
      <Tabs defaultValue="admin" className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <TabsList>
          <TabsTrigger value="admin" className="cursor-pointer">Administrador</TabsTrigger>
          <TabsTrigger value="staff" className="cursor-pointer">Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="admin">
          <div className="flex flex-row items-center justify-center my-4 ">
            <Image src="/favicon.ico" width={50} height={50} alt="Tacos al comal logo" />
            <h1 className=" flex justify-center items-center text-2xl font-bold text-center m-6">COMAL | Login</h1>
          </div>

          <form action={formAction} className="space-y-4">
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
            <button
              type="submit"
              className="mt-5 w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Entrar al Sistema
            </button>
          </form>
        </TabsContent>
        <TabsContent value="staff">
          <div className="flex flex-row items-center justify-center my-4 ">
            <Image src="/favicon.ico" width={50} height={50} alt="Tacos al comal logo" />
            <h1 className=" flex justify-center items-center text-2xl font-bold text-center m-6">COMAL | Login</h1>
          </div>

          <form action={formAction} className="space-y-4">

            <div className="flex gap-2  flex-col flex-1 items-center justify-center">
              <div className="flex flex-1 flex-row items-center gap-3 justify-center">
                              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input type="hidden" name="name" value={selectedUser} />
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-60 justify-between cursor-pointer">
                    {selectedUser
                      ? staffList.find((u) => u.name === selectedUser)?.name
                      : "Seleccionar personal..."}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-0">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        <CommandGroup>
                          {staffList.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.name ? user.name : ""}
                              onSelect={(currentValue) => {
                                setSelectedUser(currentValue);
                                setOpen(false);
                              }}
                            >
                              <CheckIcon className={cn(
                                "mr-2 h-4 w-4",
                                selectedUser === user.name ? "opacity-100" : "opacity-0"
                              )} />
                              {user.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              </div>

              <div className="flex flex-1 flex-row items-center gap-3 justify-center">
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
            </div>
            <button
              type="submit"
              className="mt-5 w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Entrar al Sistema
            </button>
          </form>
        </TabsContent>
      </Tabs>

    </div>
  )
}