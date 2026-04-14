"use client"
import { useActionState } from "react";

import { login } from "@/lib/actions/auth_action";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useState } from "react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [state, formAction, isPending] = useActionState(login, null);




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
                <label className="block text-sm font-medium text-gray-700">Usuario</label>
                <input required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  name="username" />


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
            <button type="submit" className="mt-5 w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors">
              Entrar al Sistema
            </button>
          </form>
        </TabsContent>
      </Tabs>

    </div>
  )
}