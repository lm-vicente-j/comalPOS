'use server'

import { signIn } from "../auth"
import { signOut } from "../auth"
import { AuthError } from "next-auth"

export async function login(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')
  const name = formData.get("name");
  const pin = formData.get("pin")
  
const role = email ? "ADMIN" : "STAFF";

  try{
    await signIn("credentials", {
      email,
      password,
      name: name,
      pin,
      role,
      redirectTo: "/pos",
    });
  } catch(e){
    if (e instanceof AuthError) {
      switch (e.type) {
        case "CredentialsSignin":
          return { error: "INVALID CREDENTIAL" };
        default:
          return { error: "BAD REQUEST" };
      }
    }

    throw e;
  }

}

export async function logout() {

  try{
    await signOut({redirectTo:"/login"});
  }catch(e){
    throw e
  }
  
}


