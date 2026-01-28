"use server";
import prisma from "../prisma";
import z from "zod";

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  pin: z.string().nullable(),
  password: z.string().nullable(),
  role: z.string().nullable(),
  active: z.boolean().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export async function   GetAllStaffUsers(){
    try{
        const userList = await prisma.user.findMany(
      {
        select: {id: true, name: true},
        orderBy: {name:'asc'},
        where: {
          role:{ not: "ADMIN" }
        }
      }
    );

    return userList;

    }catch(e){
        console.error(e);
        return [];
    }

}