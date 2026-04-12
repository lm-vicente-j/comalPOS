import { nullable, z } from "zod";
import { Decimal

 } from "@prisma/client/runtime/client";
export const SaleStatusSchema = z.enum(["UNPAID", "PAID", "DEBT", "CANCELLED"]);
export const PaymentMethodSchema = z.enum(["TRANSFER", "CASH"]);

export const BillSchema = z.object({
  id: z.number().int(),
  description: z.string().min(1, "La descripción es requerida"),
  amount: z
  .union([z.number(), z.instanceof(Decimal)])
  .refine((val) => Number(val) > 0, { message: "El monto debe ser mayor a cero" })
  .transform((val) => Number(val)),
  date: z.date({ message: "La fecha es requerida" }),
  registered_by: z.number().int(),
  category: z.string().optional(),
  receiptUrl: z.string().min(1, "La URL del recibo es requerida").nullable(),
});

export const CustomerSchema = z.object({
  id: z.number().int(),
  customerName: z.string().min(3, "El nombre debe contener al menos 3 carácteres."),
  phone: z.string().min(1, "El teléfono es requerido"),
  alias: z.string().min(1, "El alias es requerido"),
  lastConsumption: z.date().nullable().or(z.string().min(1, "La fecha es requerida")),
  currentBalance: z.number({ message: "El balance actual es requerido" }),
  registeredDate: z.date().nullable().or(z.string().min(1, "La fecha de registro es requerida")),

  debtors: z.array(
    z.object({
      id: z.number().int(),
      saleID: z.number().int(),
      amount: z.number({ message: "El monto es requerido" }).nonnegative("El monto no puede ser negativo"),
      status: z.string().min(1, "El estado es requerido"),
    })
  ).optional(),

  sales: z.array(
    z.object({
      id: z.number().int(),
      total: z.number({ message: "El total es requerido" }),
      status: z.string().min(1, "El estado es requerido"),
      source_type: z.string().min(1, "El tipo de fuente es requerido"),
      createdAt: z.date().nullable().or(z.string().min(1, "La fecha es requerida")),
    })
  ).optional(),
});


export const DebtorsSchema = z.object({
  id: z.number().int(),
  saleID: z.number().int(),
  customerID: z.number().int(),
  amount: z.number({ message: "El monto es requerido" }).positive("El monto debe ser mayor a cero"),
  status: SaleStatusSchema,
  paidAt: z.date({ message: "La fecha de pago es requerida" }),
});

export const ProductSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(3, "Minimo 3 carácteres."),
    price: z.number().positive("El precio debe ser mayor de cero."),
    recipes: z.array(z.object({
        supplyID: z.number({ message: "El ID del insumo es requerido" }).int(),
        quantityUsed: z.number({ message: "La cantidad usada es requerida" }),
    })).optional()
});

export const RecipesSchema = z.object({
  productID: z.number({ message: "El ID del producto es requerido" }).int(),
  supplyID: z.number({ message: "El ID del insumo es requerido" }).int(),
  quantityUsed: z.number({ message: "La cantidad usada es requerida" }),
});

export const SalarySchema = z.object({
  id: z.number().int(),
  userID: z.number({ message: "El ID del usuario es requerido" }).int(),
  amount: z.coerce.number({ message: "El monto es requerido" }).positive("El monto debe ser mayor a cero"),
  payDate: z.date({ message: "La fecha de pago es requerida" }),
  period: z.string().min(1, "El período es requerido"),
});

export const SaleItemsSchema = z.object({
  id: z.number().int(),
  saleID: z.number({ message: "El ID de la venta es requerido" }).int(),
  productID: z.number({ message: "El ID del producto es requerido" }).int(),
  quantity: z.number({ message: "La cantidad es requerida" }).int().positive("La cantidad debe ser mayor a cero"),
  unitPrice: z.number({ message: "El precio unitario es requerido" }).positive("El precio unitario debe ser mayor a cero"),
  subtotal: z.number({ message: "El subtotal es requerido" }).nonnegative("El subtotal no puede ser negativo"),
});

export const SalesSchema = z.object({
  id: z.number().int(),
  total: z.number({ message: "El total es requerido" }),
  source_type: z.string().min(1, "El tipo de fuente es requerido"),
  customerID: z.number({ message: "El ID del cliente es requerido" }).int(),
  placedBy: z.number({ message: "El campo 'placedBy' es requerido" }).int(),
  createdAt: z.date({ message: "La fecha de creación es requerida" }),
  status: SaleStatusSchema,
  payment_method: z.string().min(1, "El método de pago es requerido"),
});

export const SupplySchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  measureUnit: z.string().min(1, "La unidad es requerida"),
  currentStock: z.number({ message: "El stock actual es requerido" }).nonnegative("El stock no puede ser negativo"),
  unitCost: z.number({ message: "El costo unitario es requerido" }).nonnegative("El costo no puede ser negativo").min(1, "El costo unitario no puede ser cero."),
  recipes: z.array(
    z.object({
      productID: z.number({ message: "El ID del producto es requerido" }).int(),
      supplyID: z.number({ message: "El ID del insumo es requerido" }).int(),
      quantityUsed: z.number({ message: "La cantidad usada es requerida" }),
    })
  ).optional(),
});

export const UserSchema = z.object({
  id: z.number().int().optional(),
  email: z.string().nullable().or(z.literal("")),
  name: z.string().min(3, "El nombre es requerido"),
  username: z.string().min(1, "El nombre de usuario es requerido"),
  pin: z.string().min(1, "El PIN es requerido").nullable(),
  password: z.string().min(4, "Mínimo 4 caracteres").nullable().or(z.literal("")),
  role: z.string().min(1, "El rol es requerido"),
  registeredAt: z.date({ message: "La fecha de registro es requerida" }),
  active: z.boolean({ message: "El campo activo es requerido" }),
});

export type Bill = z.infer<typeof BillSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Debtors = z.infer<typeof DebtorsSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Recipes = z.infer<typeof RecipesSchema>;
export type Salary = z.infer<typeof SalarySchema>;
export type SaleItems = z.infer<typeof SaleItemsSchema>;
export type Sales = z.infer<typeof SalesSchema>;
export type Supply = z.infer<typeof SupplySchema>;
export type User = z.infer<typeof UserSchema>;