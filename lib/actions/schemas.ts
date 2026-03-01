import z from "zod";


export type User = z.infer<typeof UserSchema>;

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