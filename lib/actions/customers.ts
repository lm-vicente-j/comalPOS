import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.number().int(),
  customerName: z.string().nullable(),
  phone: z.string().nullable(),
  alias: z.string().nullable(),
  lastConsumption: z.date().nullable().or(z.string()),
  currentBalance: z.number(),
  registeredDate: z.date().nullable().or(z.string()),

  debtors: z.array(
    z.object({
      id: z.number().int(),
      saleID: z.number().int().nullable(),
      amount: z.number(),
      status: z.string().nullable(),
    })
  ).optional(),

  sales: z.array(
    z.object({
      id: z.number().int(),
      total: z.number().nullable(),
      status: z.string().nullable(),
      source_type: z.string().nullable(),
      createdAt: z.date().nullable().or(z.string()),
    })
  ).optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;