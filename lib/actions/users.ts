"use server";
import prisma from "../prisma";
import { User } from "./schemas";
import bcrypt from 'bcryptjs';
import { revalidatePath } from "next/cache";
import { UserSchema } from "./schemas";
import z from "zod";

function GenerateUsername({ fullname }: { fullname: string }) {
  let username = "";
  const normalized = fullname.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const splitted = normalized.toUpperCase().split(" ");
  const firstLastName = splitted[splitted.length - 2];
  const secondLastName = splitted[splitted.length - 1];
  const firstVowels = firstLastName.match(/[AEIOU]/gi);

  username = firstLastName[0];

  if (firstVowels) {
    username += firstVowels[0];
    username += secondLastName[0];
    username += splitted[0][0];

    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    username += arr[0].toString()[0];
    username += arr[0].toString()[1];

    return username;
  } else {
    return "";
  }
}

export async function GetAllUsers() {
  try {
    const userList = await prisma.users.findMany({
      select: { id: true, name: true, email: true, username: true, active: true, role: true },
      orderBy: { name: 'asc' },
    });
    return userList;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function saveUser(data: Partial<User>) {

  if (data.id) {
    const parsed = UserSchema.pick({ id: true, password: true, name: true, role: true, pin: true }).safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }
  } else {
    const parsed = UserSchema.pick({ name: true, role: true, password: true }).safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos", fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }
  }

  try {
    const { id, name, role, active, password, email, pin } = data;

    if (!name) return { success: false };

    const rawCredential = role === "STAFF" ? pin : password;
    let hashedPass: string | null = null;

    if (rawCredential && rawCredential.trim() !== "") {
      hashedPass = await bcrypt.hash(rawCredential, 10);
    }

    if (id) {
      // UPDATE
      const updateData: Record<string, any> = { name, role, active };

      if (hashedPass) {
        if (role === "STAFF") {
          updateData.pin = hashedPass;
          updateData.password = null;
        } else {
          updateData.password = hashedPass;
          updateData.pin = null;
        }
      }

      await prisma.users.update({
        where: { id },
        data: updateData,
      });

    } else {
      // CREATE
      if (!hashedPass) {
        return { success: false, error: "Se requiere contraseña o PIN para crear un usuario." };
      }

      const username = GenerateUsername({ fullname: name });

      if (!username) {
        return { success: false, error: "No se pudo generar un nombre de usuario con el nombre proporcionado." };
      }

      if (role === "STAFF") {
        await prisma.users.create({
          data: {
            name,
            role,
            active: active ?? true,
            pin: hashedPass,
            username,
          },
        });
      } else {
        await prisma.users.create({
          data: {
            name,
            role,
            active: active ?? true,
            password: hashedPass,
            username,
            email,
          },
        });
      }
    }

    revalidatePath("/admin/crm");
    return { success: true };

  } catch (e) {
    console.error(e);
    return { success: false, error: "Error al guardar el usuario." };
  }
}