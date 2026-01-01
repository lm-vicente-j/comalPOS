// app/(auth)/login/page.tsx
import { login } from "@/lib/actions/auth_action";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-rounded">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex flex-row items-center justify-center my-4 ">
          <Image src="/favicon.ico" width={50} height={50} alt="Tacos al comal logo" />
          <h1 className=" flex justify-center items-center text-2xl font-bold text-center m-6">COMAL | Login</h1>
        </div>
        
        <form action={login} className="space-y-4">
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
      </div>
    </div>
  )
}