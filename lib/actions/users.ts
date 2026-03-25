"use server";
import { success } from "zod";
import prisma from "../prisma";
import { User } from "./schemas";
import bcrypt from 'bcryptjs';


export async function GetAllUsers() {
  try {
    const userList = await prisma.users.findMany(
      {
        select: { id: true, name: true, active: true, role: true },
        orderBy: { name: 'asc' },
      }
    );

    return userList;

  } catch (e) {
    console.error(e);
    return [];
  }

}

export async function saveUser(data: User) {


  try {
    const { id, name, role, active, password, email, pin } = data;

    // Generate unique username
    const username = name?.toUpperCase().replace(/\s+/g, '');
    
    const hashedPass = await bcrypt.hash(password ?? "", 10);

    // TODO: Add pass or pin depending on role

    await prisma.users.upsert({
        where: { id: id ?? -1 },
            update: { name, role, active },
            create: { 
                name, 
                role, 
                active: active ?? true,
                password: hashedPass, 
                username: username
            },
    });

  } catch (e) {
    return { success: false, error: "Error on save user" }
  }


}