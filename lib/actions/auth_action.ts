// lib/auth-actions.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')


  if (email === "admin@local.com" && password === "1234") {
    const userData = { email, role: 'admin', name: 'owner' }
    
    const cookieStore = await cookies()
    cookieStore.set('session', JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
  } else {
    return { error: "Wrong credentials" }
  }

  // 3. Redirigir al Dashboard tras éxito
  redirect('/')
}

export async function logout() {

  const cookieStore = await cookies();

  cookieStore.delete('session');

  redirect("/login");
  
}