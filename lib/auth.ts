import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/app/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {label: "email", type: "text"},
        name: {label: "name", type: "text"},
        password: {label: "password", type: "password"},
        pin: {label: "pin", type: "password"},
        role: {label: "role", type: "text"},
      },
      async authorize(credentials){
        if(!credentials) return null;

        // ADMIN
        if(credentials.role === "ADMIN"){
          
          // query DB
          const user = await prisma.user.findUnique({
            where: {email: credentials.email as string}
          });

          // If user is find and password is not null
          if(user && user.password){
            const isPassCorrect = await bcrypt.compare(
              credentials.password as string, // from client side
              user.password // from DB
            );

            if(isPassCorrect) return user;
          } 


        }

        if(credentials.role === "STAFF"){
          
          // query DB
          const user = await prisma.user.findFirst({
            where: {name: credentials.name as string}
          });

          // If user is find and password is not null
          if(user && user.pin){
            const isPinCorrect = await bcrypt.compare(
              credentials.pin as string, // from client side
              user.pin // from DB
            );
            if(isPinCorrect) return user;
            
          } 


        }
        
          
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({token, user}){
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login"
  },
  
})