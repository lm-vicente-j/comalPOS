import { z } from "zod";

export const SaleStatusSchema = z.enum(["UNPAID", "PAID", "DEBT", "CANCELLED"]);
export const PaymentMethodSchema = z.enum(["TRANSFER", "CASH"]);


export const BillSchema = z.object({
  id: z.number().int(),
  description: z.string().nullable(),
  amount: z.number(), // Mapping Decimal to number
  category: z.string().nullable(),
  date: z.date().nullable(),
  registered_by: z.number().int(),
  receiptUrl: z.string().nullable(),
});

export const CustomerSchema = z.object({
  id: z.number().int(),
  customerName: z.string().nullable(),
  phone: z.string().nullable(),
  alias: z.string().nullable(),
  lastConsumption: z.date().nullable(),
  currentBalance: z.number(),
  registeredDate: z.date().nullable(),
});

export const DebtorsSchema = z.object({
  id: z.number().int(),
  saleID: z.number().int(),
  customerID: z.number().int(),
  amount: z.number(),
  status: SaleStatusSchema,
  paidAt: z.date().nullable(),
});

export const ProductsSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  price: z.number(),
});

export const RecipesSchema = z.object({
  productID: z.number().int(),
  supplyID: z.number().int(),
  quantityUsed: z.number().nullable(),
});

export const SalarySchema = z.object({
  id: z.number().int(),
  userID: z.number().int(),
  amount: z.number(),
  payDate: z.date().nullable(),
  period: z.string().nullable(),
});

export const SaleItemsSchema = z.object({
  id: z.number().int(),
  saleID: z.number().int(),
  productID: z.number().int(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  subtotal: z.number(),
});

export const SalesSchema = z.object({
  id: z.number().int(),
  total: z.number().nullable(),
  source_type: z.string().nullable(),
  customerID: z.number().int().nullable(),
  placedBy: z.number().int(),
  createdAt: z.date(),
  status: SaleStatusSchema,
  payment_method: z.string().nullable(),
});

export const SuppliesSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  measureUnit: z.string().nullable(),
  currentStock: z.number(),
  unitCost: z.number(),
});

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  pin: z.string().nullable(),
  password: z.string().nullable(),
  role: z.string().nullable(),
  registeredAt: z.date().nullable(),
  active: z.boolean().nullable(),
});

export type Bill = z.infer<typeof BillSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Debtors = z.infer<typeof DebtorsSchema>;
export type Products = z.infer<typeof ProductsSchema>;
export type Recipes = z.infer<typeof RecipesSchema>;
export type Salary = z.infer<typeof SalarySchema>;
export type SaleItems = z.infer<typeof SaleItemsSchema>;
export type Sales = z.infer<typeof SalesSchema>;
export type Supplies = z.infer<typeof SuppliesSchema>;
export type User = z.infer<typeof UserSchema>;