"use server";
import { success } from "zod";
import prisma from "../prisma";
import { User } from "./schemas";
import bcrypt from 'bcryptjs';
import { revalidatePath } from "next/cache";


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

export async function saveUser(data: Partial<User>) {


  try {
    const { id, name, role, active, password, email, pin } = data;

    // Generate unique username
    const username = name?.toUpperCase().replace(/\s+/g, '');

    const hashedPass = await bcrypt.hash(password ?? "", 10);

    // TODO: Add pass or pin depending on role

    if (id) {
      await prisma.users.update({
        where: { id },
        data: { name, role, active },
      });
    } else {
      await prisma.users.create({
        data: {
          name,
          role,
          active: active ?? true,
          password: hashedPass,
          username,
        },
      });
    }



    revalidatePath("/admin/crm")
    return { success: true }

  } catch (e) {
    console.log(e)
    return { success: false, error: "Error on save user" }
  }


}