"use server";
import prisma from "../prisma";
import { User } from "./schemas";
import bcrypt from 'bcryptjs';
import { revalidatePath } from "next/cache";
import { UserSchema } from "./schemas";
import { auth } from "../auth";
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
  const session = await auth();
  if (!session?.user) return [];

  try {
    const userList = await prisma.users.findMany({
      select: { id: true, name: true, email: true, username: true, active: true, role: true, password: true, pin: true },
      orderBy: { name: 'asc' },
    });
    // Expose only whether a credential exists; hashes never leave the server.
    return userList.map(({ password, pin, ...user }) => ({
      ...user,
      hasPassword: !!password,
      hasPin: !!pin,
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function searchUsers(query: string, limit = 20) {
  const session = await auth();
  if (!session?.user) return [];

  const trimmed = query.trim();

  try {
    return await prisma.users.findMany({
      where: trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { username: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: { id: true, name: true, username: true, registeredAt: true },
      orderBy: { name: 'asc' },
      take: limit,
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function saveUser(data: Partial<User>) {

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "UNAUTHORIZED" };
  }

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
        // Admins log in with email + password, so one must always exist.
        const adminEmail = email?.trim() ? email : `${username.toLowerCase()}@bonfood.com`;

        await prisma.users.create({
          data: {
            name,
            role,
            active: active ?? true,
            password: hashedPass,
            username,
            email: adminEmail,
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