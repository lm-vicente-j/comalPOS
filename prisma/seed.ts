/**
 * SEED de gran volumen para ComalPOS
 * ----------------------------------------------------------------
 * Pobla TODOS los esquemas con datos realistas para probar
 * rendimiento de la aplicación bajo carga.
 *
 * Productos basados en el menú real del negocio (taquería mexicana).
 * Insumos y recetas mapeados de forma verídica al menú.
 *
 * Consistencias garantizadas:
 *   - currentBalance del cliente = suma de sus deudas UNPAID en debtors
 *   - lastConsumption del cliente = fecha de su última venta
 *   - Solo UNA jornada queda en estado OPEN (la más reciente)
 *   - Cada venta y gasto cae dentro del rango de su jornada
 *   - Cada sale con status=DEBT genera su registro en debtors (saleID es @unique)
 *   - sale_items.unitPrice respeta el precio del producto
 *
 * Volúmenes configurables vía variables de entorno (ver SEED_* abajo).
 * Valores por defecto producen ~100k ventas y ~300k sale_items.
 */

import {
  PrismaClient,
  SaleStatus,
  JornadaStatus,
  SavingsMovementType,
  GoalStatus,
} from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({ adapter })

// =========================================================================
// CONFIGURACIÓN DE VOLUMEN (override vía env vars: SEED_USERS, SEED_SALES, etc.)
// =========================================================================
const cfg = {
  USERS:        Number(process.env.SEED_USERS        ?? 25),
  CUSTOMERS:    Number(process.env.SEED_CUSTOMERS    ?? 5_000),
  SUPPLIES:     Number(process.env.SEED_SUPPLIES     ?? 80),   // base + relleno
  JORNADAS:     Number(process.env.SEED_JORNADAS     ?? 365),  // un año
  SALES:        Number(process.env.SEED_SALES        ?? 100_000),
  BILLS:        Number(process.env.SEED_BILLS        ?? 3_000),
  SAVINGS_MOVS: Number(process.env.SEED_SAVINGS_MOVS ?? 1_000),
  SAVINGS_GOALS:Number(process.env.SEED_SAVINGS_GOALS?? 10),
  CONTRIB_PER_GOAL: Number(process.env.SEED_CONTRIB_PER_GOAL ?? 20),
  SALARY_PERIODS:   Number(process.env.SEED_SALARY_PERIODS   ?? 24), // ~1 año quincenal
  CHUNK_SALES:      Number(process.env.SEED_CHUNK_SALES      ?? 2_000),
  CHUNK_ITEMS:      Number(process.env.SEED_CHUNK_ITEMS      ?? 5_000),
  // Rango temporal de los datos
  START_DATE:  new Date(process.env.SEED_START_DATE ?? "2025-05-27"),
  END_DATE:    new Date(process.env.SEED_END_DATE   ?? "2026-05-27"),
}

// =========================================================================
// HELPERS
// =========================================================================
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min: number, max: number, d = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(d))
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
const chance = (p: number) => Math.random() < p

function timeAgoDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// =========================================================================
// CATÁLOGOS REALISTAS
// =========================================================================
const FIRST_NAMES = [
  "María", "José", "Juan", "Guadalupe", "Francisco", "Antonio", "Margarita",
  "Jesús", "Verónica", "Alejandro", "Patricia", "Roberto", "Leticia", "Miguel",
  "Rosa", "Carlos", "Ana", "Luis", "Sofía", "Pedro", "Laura", "Daniel", "Diego",
  "Lucía", "Andrés", "Isabel", "Ricardo", "Fernanda", "Hugo", "Adriana",
  "Manuel", "Mariana", "Sergio", "Itzel", "Raúl", "Beatriz", "Eduardo",
  "Karla", "Octavio", "Mónica", "Arturo", "Norma", "Rubén", "Cecilia",
]
const LAST_NAMES = [
  "García", "Hernández", "López", "Martínez", "González", "Pérez", "Rodríguez",
  "Sánchez", "Ramírez", "Flores", "Cruz", "Morales", "Reyes", "Gutiérrez",
  "Ortiz", "Chávez", "Ramos", "Vázquez", "Castro", "Mendoza", "Rivera",
  "Romero", "Torres", "Aguilar", "Vargas", "Jiménez", "Domínguez", "Soto",
  "Contreras", "Salazar", "Bautista", "Núñez", "Cervantes", "Estrada",
  "Luna", "Solís", "Velázquez", "Herrera", "Medina", "Cabrera", "Arroyo",
]
const ALIASES = [
  "Güero", "Flaco", "Negro", "Gordo", "Chino", "Chivo", "Chaparro", "Lalo",
  "Beto", "Toño", "Memo", "Pepe", "Chuy", "Cheto", "Tito", "Lupita", "Pancho",
  "Caco", "Tuca", "Mago", "Chela", "Nacho", "Moy", "Vale", "Fer", "Pao", "Sam",
]

const fullName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`

// --- MENÚ REAL (basado en MENU_Hoja1_.csv) ---------------------------------
const MENU: { name: string; price: number; supplies: { key: string; qty: number }[] }[] = [
  // Tacos
  { name: "Taco Arrachera",            price: 55, supplies: [{key:"tortilla",qty:1},{key:"arrachera",qty:0.08},{key:"cebolla",qty:0.01},{key:"cilantro",qty:0.005}] },
  { name: "Taco Pollo",                price: 35, supplies: [{key:"tortilla",qty:1},{key:"pollo",qty:0.08},{key:"cebolla",qty:0.01},{key:"cilantro",qty:0.005}] },
  { name: "Taco Chuleta Ahumada",      price: 35, supplies: [{key:"tortilla",qty:1},{key:"chuleta",qty:0.08},{key:"cebolla",qty:0.01},{key:"cilantro",qty:0.005}] },
  { name: "Taco Longaniza",            price: 35, supplies: [{key:"tortilla",qty:1},{key:"longaniza",qty:0.08},{key:"cebolla",qty:0.01},{key:"cilantro",qty:0.005}] },
  { name: "Taco Carne Enchilada",      price: 38, supplies: [{key:"tortilla",qty:1},{key:"puerco",qty:0.08},{key:"chile_guajillo",qty:0.01},{key:"cebolla",qty:0.01}] },
  { name: "Taco Campechano",           price: 38, supplies: [{key:"tortilla",qty:1},{key:"arrachera",qty:0.04},{key:"longaniza",qty:0.04},{key:"cebolla",qty:0.01}] },
  { name: "Taco Cecina",               price: 50, supplies: [{key:"tortilla",qty:1},{key:"cecina",qty:0.08},{key:"cebolla",qty:0.01},{key:"cilantro",qty:0.005}] },
  // Huaraches
  { name: "Huarache Sencillo",         price: 35, supplies: [{key:"masa",qty:0.15},{key:"frijoles",qty:0.05},{key:"queso",qty:0.03},{key:"lechuga",qty:0.02}] },
  { name: "Huarache Arrachera",        price: 145,supplies: [{key:"masa",qty:0.15},{key:"arrachera",qty:0.15},{key:"frijoles",qty:0.05},{key:"queso",qty:0.04},{key:"lechuga",qty:0.02}] },
  { name: "Huarache Pollo",            price: 75, supplies: [{key:"masa",qty:0.15},{key:"pollo",qty:0.12},{key:"frijoles",qty:0.05},{key:"queso",qty:0.03}] },
  { name: "Huarache Puerco",           price: 75, supplies: [{key:"masa",qty:0.15},{key:"puerco",qty:0.12},{key:"frijoles",qty:0.05},{key:"queso",qty:0.03}] },
  { name: "Huarache Campechano",       price: 85, supplies: [{key:"masa",qty:0.15},{key:"arrachera",qty:0.06},{key:"longaniza",qty:0.06},{key:"frijoles",qty:0.05},{key:"queso",qty:0.03}] },
  { name: "Huarache Carne Enchilada",  price: 85, supplies: [{key:"masa",qty:0.15},{key:"puerco",qty:0.12},{key:"chile_guajillo",qty:0.01},{key:"frijoles",qty:0.05}] },
  // Chilaquiles
  { name: "Chilaquiles con Huevo",     price: 55, supplies: [{key:"totopos",qty:0.1},{key:"salsa_roja",qty:0.1},{key:"huevo",qty:2},{key:"crema",qty:0.05}] },
  { name: "Chilaquiles con Arrachera", price: 145,supplies: [{key:"totopos",qty:0.1},{key:"salsa_roja",qty:0.1},{key:"arrachera",qty:0.12},{key:"crema",qty:0.05}] },
  { name: "Chilaquiles con Puerco o Pollo", price: 75, supplies: [{key:"totopos",qty:0.1},{key:"salsa_roja",qty:0.1},{key:"pollo",qty:0.1},{key:"crema",qty:0.05}] },
  // Gorditas
  { name: "Gordita Chicharrón Sencilla",      price: 30, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.06}] },
  { name: "Gordita Chicharrón Quesillo",      price: 38, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.06},{key:"quesillo",qty:0.03}] },
  { name: "Gordita Chicharrón Tinga",         price: 40, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.06},{key:"tinga",qty:0.05}] },
  { name: "Gordita Chicharrón Quesillo Tinga",price: 45, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.06},{key:"quesillo",qty:0.03},{key:"tinga",qty:0.05}] },
  { name: "Gordita Chicharrón Puerco",        price: 45, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.04},{key:"puerco",qty:0.08}] },
  { name: "Gordita Chicharrón Pollo",         price: 45, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.04},{key:"pollo",qty:0.08}] },
  { name: "Gordita Chicharrón Longaniza",     price: 45, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.04},{key:"longaniza",qty:0.08}] },
  { name: "Gordita Chicharrón Chuleta",       price: 45, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.04},{key:"chuleta",qty:0.08}] },
  { name: "Gordita Chicharrón Quesillo Puerco",price:50, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.04},{key:"quesillo",qty:0.03},{key:"puerco",qty:0.08}] },
  { name: "Gordita Chicharrón Arrachera",     price: 55, supplies: [{key:"masa",qty:0.12},{key:"chicharron",qty:0.04},{key:"arrachera",qty:0.08}] },
  // Sopes
  { name: "Sope Sencillo",             price: 13, supplies: [{key:"masa",qty:0.08},{key:"frijoles",qty:0.03}] },
  { name: "Sope Arrachera",            price: 40, supplies: [{key:"masa",qty:0.08},{key:"arrachera",qty:0.06},{key:"frijoles",qty:0.03}] },
  { name: "Sope Pollo y Puerco",       price: 30, supplies: [{key:"masa",qty:0.08},{key:"pollo",qty:0.04},{key:"puerco",qty:0.04},{key:"frijoles",qty:0.03}] },
  { name: "Sope Huevo",                price: 23, supplies: [{key:"masa",qty:0.08},{key:"huevo",qty:1},{key:"frijoles",qty:0.03}] },
  { name: "Sope Quesillo",             price: 20, supplies: [{key:"masa",qty:0.08},{key:"quesillo",qty:0.04},{key:"frijoles",qty:0.03}] },
  { name: "Sope Chicharrón",           price: 20, supplies: [{key:"masa",qty:0.08},{key:"chicharron",qty:0.05}] },
  { name: "Sope Tinga",                price: 20, supplies: [{key:"masa",qty:0.08},{key:"tinga",qty:0.05},{key:"frijoles",qty:0.03}] },
  // Enchiladas
  { name: "Enchiladas de Pollo",       price: 75, supplies: [{key:"tortilla",qty:3},{key:"pollo",qty:0.1},{key:"salsa_roja",qty:0.1},{key:"crema",qty:0.04}] },
  { name: "Enmoladas de Pollo",        price: 80, supplies: [{key:"tortilla",qty:3},{key:"pollo",qty:0.1},{key:"mole",qty:0.1},{key:"crema",qty:0.04}] },
  // Tortas
  { name: "Torta Arrachera",           price: 65, supplies: [{key:"bolillo",qty:1},{key:"arrachera",qty:0.12},{key:"frijoles",qty:0.03},{key:"jitomate",qty:0.02}] },
  { name: "Torta Pollo Empanizado",    price: 45, supplies: [{key:"bolillo",qty:1},{key:"pollo",qty:0.12},{key:"frijoles",qty:0.03},{key:"lechuga",qty:0.02}] },
  { name: "Torta Puerco Empanizado",   price: 45, supplies: [{key:"bolillo",qty:1},{key:"puerco",qty:0.12},{key:"frijoles",qty:0.03},{key:"lechuga",qty:0.02}] },
  { name: "Torta Campechana",          price: 45, supplies: [{key:"bolillo",qty:1},{key:"arrachera",qty:0.06},{key:"longaniza",qty:0.06},{key:"frijoles",qty:0.03}] },
  // Otros
  { name: "Huevos al Gusto con Frijoles", price: 50, supplies: [{key:"huevo",qty:2},{key:"frijoles",qty:0.08},{key:"tortilla",qty:3}] },
  // Bebidas
  { name: "Agua de Fruta Natural 1L",  price: 25, supplies: [{key:"fruta",qty:0.2},{key:"azucar",qty:0.05}] },
  { name: "Refresco",                  price: 25, supplies: [{key:"refresco",qty:1}] },
  { name: "Té",                        price: 15, supplies: [{key:"te_bolsa",qty:1},{key:"azucar",qty:0.02}] },
  { name: "Café",                      price: 20, supplies: [{key:"cafe",qty:0.015},{key:"azucar",qty:0.02}] },
  { name: "Café con Leche",            price: 28, supplies: [{key:"cafe",qty:0.015},{key:"leche",qty:0.15},{key:"azucar",qty:0.02}] },
]

// --- INSUMOS BASE ---------------------------------------------------------
const SUPPLIES_BASE: { key: string; name: string; unit: string; cost: number }[] = [
  { key: "tortilla",       name: "Tortilla",                  unit: "pza",   cost: 1.2  },
  { key: "masa",           name: "Masa de maíz",              unit: "kg",    cost: 28   },
  { key: "bolillo",        name: "Bolillo",                   unit: "pza",   cost: 4    },
  { key: "arrachera",      name: "Arrachera",                 unit: "kg",    cost: 320  },
  { key: "pollo",          name: "Pollo deshebrado",          unit: "kg",    cost: 140  },
  { key: "puerco",         name: "Carne de puerco",           unit: "kg",    cost: 180  },
  { key: "chuleta",        name: "Chuleta ahumada",           unit: "kg",    cost: 200  },
  { key: "longaniza",      name: "Longaniza",                 unit: "kg",    cost: 160  },
  { key: "cecina",         name: "Cecina",                    unit: "kg",    cost: 280  },
  { key: "chicharron",     name: "Chicharrón prensado",       unit: "kg",    cost: 220  },
  { key: "tinga",          name: "Tinga de pollo preparada",  unit: "kg",    cost: 180  },
  { key: "mole",           name: "Mole poblano",              unit: "kg",    cost: 200  },
  { key: "salsa_roja",     name: "Salsa roja",                unit: "litro", cost: 60   },
  { key: "queso",          name: "Queso rallado",             unit: "kg",    cost: 180  },
  { key: "quesillo",       name: "Quesillo Oaxaca",           unit: "kg",    cost: 220  },
  { key: "crema",          name: "Crema",                     unit: "litro", cost: 80   },
  { key: "huevo",          name: "Huevo",                     unit: "pza",   cost: 4    },
  { key: "frijoles",       name: "Frijoles refritos",         unit: "kg",    cost: 35   },
  { key: "cebolla",        name: "Cebolla blanca",            unit: "kg",    cost: 25   },
  { key: "cilantro",       name: "Cilantro",                  unit: "kg",    cost: 30   },
  { key: "lechuga",        name: "Lechuga",                   unit: "kg",    cost: 25   },
  { key: "jitomate",       name: "Jitomate",                  unit: "kg",    cost: 30   },
  { key: "chile_guajillo", name: "Chile guajillo",            unit: "kg",    cost: 120  },
  { key: "totopos",        name: "Totopos",                   unit: "kg",    cost: 80   },
  { key: "fruta",          name: "Fruta para aguas",          unit: "kg",    cost: 40   },
  { key: "azucar",         name: "Azúcar",                    unit: "kg",    cost: 28   },
  { key: "refresco",       name: "Refresco 600ml",            unit: "pza",   cost: 14   },
  { key: "te_bolsa",       name: "Té en bolsita",             unit: "pza",   cost: 2    },
  { key: "cafe",           name: "Café molido",               unit: "kg",    cost: 320  },
  { key: "leche",          name: "Leche entera",              unit: "litro", cost: 28   },
]

// --- CATEGORÍAS DE GASTOS ---
const BILL_CATEGORIES = [
  { cat: "RENTA",         min: 8000,  max: 18000, descs: ["Renta del local"] },
  { cat: "SERVICIOS",     min: 200,   max: 3500,  descs: ["Pago de luz CFE", "Pago de gas", "Recarga de agua", "Internet Telmex"] },
  { cat: "INSUMOS",       min: 300,   max: 6500,  descs: ["Compra de masa", "Compra de carne", "Despensa de la semana", "Verdura del mercado", "Pollo del proveedor", "Refrescos al mayoreo"] },
  { cat: "MANTENIMIENTO", min: 150,   max: 4000,  descs: ["Reparación de plancha", "Mantenimiento refrigerador", "Cambio de tanque de gas", "Compra de utensilios"] },
  { cat: "OTROS",         min: 50,    max: 2000,  descs: ["Bolsas y desechables", "Limpieza", "Propinas", "Imprevistos", "Estacionamiento proveedor"] },
]

const SOURCE_TYPES = [
  "VENTA_LIBRE", "MESA_1", "MESA_2", "MESA_3", "MESA_4", "MESA_5",
  "MESA_6", "MESA_7", "MESA_8", "BARRA", "PARA_LLEVAR", "RAPPI", "UBER_EATS",
]

const SAVINGS_GOAL_NAMES = [
  "Comprar nuevo refrigerador",
  "Remodelación del local",
  "Comprar plancha industrial",
  "Vacaciones del equipo",
  "Fondo de emergencia",
  "Ampliación de cocina",
  "Compra de mobiliario",
  "Letrero luminoso",
  "Aguinaldos",
  "Reserva de inversión",
]

// =========================================================================
// MAIN
// =========================================================================
async function main() {
  const t0 = Date.now()
  console.log("🌱 Iniciando seed de gran volumen...")
  console.log("📊 Configuración:", cfg)

  // ---------- LIMPIEZA ----------
  console.log("\n🧹 Limpiando registros existentes...")
  await prisma.sale_items.deleteMany({})
  await prisma.debtors.deleteMany({})
  await prisma.sales.deleteMany({})
  await prisma.recipes.deleteMany({})
  await prisma.products.deleteMany({})
  await prisma.supplies.deleteMany({})
  await prisma.bill.deleteMany({})
  await prisma.salary.deleteMany({})
  await prisma.goal_contribution.deleteMany({})
  await prisma.savings_goal.deleteMany({})
  await prisma.savings_movement.deleteMany({})
  await prisma.jornada.deleteMany({})
  await prisma.customer.deleteMany({})
  await prisma.users.deleteMany({})

  // ---------- USERS ----------
  console.log(`\n👥 Generando ${cfg.USERS} usuarios...`)
  const passHash = await bcrypt.hash("Djw9zfq33nl7dgy", 10)
  const pinHash = await bcrypt.hash("1234", 10)

  const usersData: any[] = [
    {
      id: 1,
      email: "admin@bonfood.com",
      username: "admin",
      password: passHash,
      pin: pinHash,
      role: "ADMIN",
      name: "Administrador General",
      registeredAt: cfg.START_DATE,
      active: true,
    },
  ]
  for (let i = 2; i <= cfg.USERS; i++) {
    usersData.push({
      id: i,
      email: `staff${i}@bonfood.com`,
      username: `staff${i}`,
      password: passHash,
      pin: pinHash,
      role: "STAFF",
      name: fullName(),
      registeredAt: timeAgoDate(cfg.START_DATE, cfg.END_DATE),
      active: chance(0.95),
    })
  }
  await prisma.users.createMany({ data: usersData })

  // ---------- CUSTOMERS ----------
  console.log(`👤 Generando ${cfg.CUSTOMERS} clientes...`)
  const customersData = []
  for (let i = 1; i <= cfg.CUSTOMERS; i++) {
    customersData.push({
      id: i,
      customerName: fullName(),
      phone: `${rand(221, 999)}${rand(1000000, 9999999)}`,
      alias: pick(ALIASES),
      currentBalance: 0, // se actualizará tras crear deudas
      registeredDate: timeAgoDate(cfg.START_DATE, cfg.END_DATE),
      lastConsumption: null, // se actualizará tras crear ventas
    })
  }
  // chunked insert
  for (let i = 0; i < customersData.length; i += 1000) {
    await prisma.customer.createMany({ data: customersData.slice(i, i + 1000) })
  }

  // ---------- SUPPLIES ----------
  console.log(`🥩 Generando insumos (base: ${SUPPLIES_BASE.length}, total: ${cfg.SUPPLIES})...`)
  const supplyKeyToId = new Map<string, number>()
  const suppliesData: any[] = []
  SUPPLIES_BASE.forEach((s, i) => {
    const id = i + 1
    supplyKeyToId.set(s.key, id)
    suppliesData.push({
      id,
      name: s.name,
      measureUnit: s.unit,
      currentStock: randFloat(50, 800),
      unitCost: s.cost,
      active: true,
    })
  })
  // Relleno hasta SUPPLIES para tener volumen extra
  for (let i = SUPPLIES_BASE.length + 1; i <= cfg.SUPPLIES; i++) {
    suppliesData.push({
      id: i,
      name: `Insumo Auxiliar ${i}`,
      measureUnit: pick(["kg", "pza", "litro", "gr"]),
      currentStock: randFloat(10, 500),
      unitCost: randFloat(5, 200),
      active: chance(0.9),
    })
  }
  await prisma.supplies.createMany({ data: suppliesData })

  // ---------- PRODUCTS ----------
  console.log(`🌮 Generando ${MENU.length} productos del menú...`)
  const productsData = MENU.map((m, i) => ({
    id: i + 1,
    name: m.name,
    price: m.price,
  }))
  await prisma.products.createMany({ data: productsData })

  // ---------- RECIPES ----------
  console.log("📋 Generando recetas (producto → insumo)...")
  const recipesData: { productID: number; supplyID: number; quantityUsed: number }[] = []
  MENU.forEach((m, i) => {
    const productID = i + 1
    for (const ing of m.supplies) {
      const supplyID = supplyKeyToId.get(ing.key)
      if (!supplyID) continue
      recipesData.push({ productID, supplyID, quantityUsed: ing.qty })
    }
  })
  await prisma.recipes.createMany({ data: recipesData })

  // ---------- JORNADAS ----------
  console.log(`🕐 Generando ${cfg.JORNADAS} jornadas (1 día c/u)...`)
  const totalDays = Math.ceil(
    (cfg.END_DATE.getTime() - cfg.START_DATE.getTime()) / (1000 * 60 * 60 * 24)
  )
  const step = totalDays / cfg.JORNADAS
  const jornadasData: any[] = []
  let lastJornadaId = 0

  for (let i = 0; i < cfg.JORNADAS; i++) {
    const dayOffset = Math.floor(i * step)
    const opened = new Date(cfg.START_DATE)
    opened.setDate(opened.getDate() + dayOffset)
    opened.setHours(7, rand(0, 59), 0, 0)
    const closed = new Date(opened)
    closed.setHours(opened.getHours() + rand(10, 14), rand(0, 59), 0, 0)

    const isLast = i === cfg.JORNADAS - 1
    const isOpen = isLast // solo la última está OPEN
    const opening = randFloat(500, 2000)

    jornadasData.push({
      id: i + 1,
      openedAt: opened,
      closedAt: isOpen ? null : closed,
      openedBy: rand(1, cfg.USERS),
      closedBy: isOpen ? null : rand(1, cfg.USERS),
      status: isOpen ? JornadaStatus.OPEN : JornadaStatus.CLOSED,
      openingAmount: opening,
      expectedClosingAmount: isOpen ? null : randFloat(opening + 1000, opening + 15000),
      actualClosingAmount: isOpen ? null : randFloat(opening + 800, opening + 15500),
    })
    lastJornadaId = i + 1
  }
  for (let i = 0; i < jornadasData.length; i += 500) {
    await prisma.jornada.createMany({ data: jornadasData.slice(i, i + 500) })
  }
  console.log(`   ✓ Jornada activa (OPEN): #${lastJornadaId}`)

  // índice rápido jornada -> [openedAt, closedAt]
  const jornadaRange = jornadasData.map(j => ({
    id: j.id, start: j.openedAt as Date, end: (j.closedAt ?? new Date()) as Date,
  }))

  // ---------- SALES + SALE_ITEMS + DEBTORS (bloque pesado) ----------
  console.log(`💰 Generando ${cfg.SALES.toLocaleString()} ventas + sale_items + debtors...`)
  const sales: any[] = []
  const saleItems: any[] = []
  const debtorsData: any[] = []
  const customerBalance = new Map<number, number>()
  const customerLastConsumption = new Map<number, Date>()

  let saleItemId = 1
  let debtorId = 1

  // distribución: 50 ventas por día × 365 ≈ 18k. Para llegar a 100k usamos más por día.
  const salesPerJornada = Math.floor(cfg.SALES / cfg.JORNADAS)
  let saleId = 1

  for (const j of jornadaRange) {
    // factor por día (algunos días con más ventas)
    const factor = chance(0.2) ? randFloat(1.3, 2.0) : randFloat(0.6, 1.2)
    const count = Math.max(1, Math.round(salesPerJornada * factor))

    for (let k = 0; k < count && saleId <= cfg.SALES; k++) {
      // fecha dentro del rango de la jornada
      const createdAt = timeAgoDate(j.start, j.end)
      const placedBy = rand(1, cfg.USERS)
      // 70% tienen cliente asociado, 30% venta libre
      const customerID = chance(0.7) ? rand(1, cfg.CUSTOMERS) : null

      // Composición de la venta: 1-6 items
      const numItems = rand(1, 6)
      const itemsForSale: { productID: number; quantity: number; unitPrice: number; subtotal: number }[] = []
      const usedProductIds = new Set<number>()
      let saleTotal = 0
      for (let m = 0; m < numItems; m++) {
        let productID: number
        do { productID = rand(1, MENU.length) } while (usedProductIds.has(productID))
        usedProductIds.add(productID)
        const unitPrice = MENU[productID - 1].price
        const quantity = rand(1, 4)
        const subtotal = unitPrice * quantity
        saleTotal += subtotal
        itemsForSale.push({ productID, quantity, unitPrice, subtotal })
      }

      // status: 75% PAID, 12% DEBT, 8% UNPAID, 5% CANCELLED
      const r = Math.random()
      let status: SaleStatus
      let paymentMethod: string | null
      if (r < 0.75) {
        status = SaleStatus.PAID
        paymentMethod = chance(0.6) ? "CASH" : "TRANSFER"
      } else if (r < 0.87) {
        status = SaleStatus.DEBT
        paymentMethod = null
      } else if (r < 0.95) {
        status = SaleStatus.UNPAID
        paymentMethod = null
      } else {
        status = SaleStatus.CANCELLED
        paymentMethod = null
      }

      // si es DEBT pero no hay customer, lo asignamos
      const finalCustomerID = (status === SaleStatus.DEBT && !customerID) ? rand(1, cfg.CUSTOMERS) : customerID

      sales.push({
        id: saleId,
        total: saleTotal,
        source_type: pick(SOURCE_TYPES),
        customerID: finalCustomerID,
        placedBy,
        jornadaId: j.id,
        createdAt,
        status,
        payment_method: paymentMethod,
      })

      for (const it of itemsForSale) {
        saleItems.push({
          id: saleItemId++,
          saleID: saleId,
          productID: it.productID,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
        })
      }

      // si es deuda, registrar en debtors (saleID es @unique)
      if (status === SaleStatus.DEBT && finalCustomerID) {
        debtorsData.push({
          id: debtorId++,
          saleID: saleId,
          customerID: finalCustomerID,
          amount: saleTotal,
          status: SaleStatus.DEBT,
          paidAt: null,
        })
        customerBalance.set(finalCustomerID, (customerBalance.get(finalCustomerID) ?? 0) + saleTotal)
      }

      // tracking de última consumición
      if (finalCustomerID) {
        const prev = customerLastConsumption.get(finalCustomerID)
        if (!prev || createdAt > prev) {
          customerLastConsumption.set(finalCustomerID, createdAt)
        }
      }

      saleId++
    }
  }

  console.log(`   📦 Insertando ${sales.length.toLocaleString()} ventas en chunks de ${cfg.CHUNK_SALES}...`)
  for (let i = 0; i < sales.length; i += cfg.CHUNK_SALES) {
    await prisma.sales.createMany({ data: sales.slice(i, i + cfg.CHUNK_SALES) })
    if (i % (cfg.CHUNK_SALES * 10) === 0) {
      process.stdout.write(`      → ${i.toLocaleString()}/${sales.length.toLocaleString()}\r`)
    }
  }
  console.log(`      → ${sales.length.toLocaleString()}/${sales.length.toLocaleString()} ✓        `)

  console.log(`   📦 Insertando ${saleItems.length.toLocaleString()} sale_items en chunks de ${cfg.CHUNK_ITEMS}...`)
  for (let i = 0; i < saleItems.length; i += cfg.CHUNK_ITEMS) {
    await prisma.sale_items.createMany({ data: saleItems.slice(i, i + cfg.CHUNK_ITEMS) })
    if (i % (cfg.CHUNK_ITEMS * 10) === 0) {
      process.stdout.write(`      → ${i.toLocaleString()}/${saleItems.length.toLocaleString()}\r`)
    }
  }
  console.log(`      → ${saleItems.length.toLocaleString()}/${saleItems.length.toLocaleString()} ✓        `)

  if (debtorsData.length > 0) {
    console.log(`   📦 Insertando ${debtorsData.length.toLocaleString()} registros de debtors...`)
    for (let i = 0; i < debtorsData.length; i += cfg.CHUNK_SALES) {
      await prisma.debtors.createMany({ data: debtorsData.slice(i, i + cfg.CHUNK_SALES) })
    }
  }

  // Actualizar balance y last_consumption en cada cliente afectado
  console.log(`   🔄 Actualizando balance y lastConsumption de clientes...`)
  const affected = new Set<number>([
    ...customerBalance.keys(),
    ...customerLastConsumption.keys(),
  ])

  // Hacemos chunked con raw SQL para velocidad (Prisma updateMany no soporta different values).
  // Usamos UPDATE … FROM (VALUES …) para batch eficiente.
  const balanceUpdates = Array.from(customerBalance.entries())
  const lastConsumptionUpdates = Array.from(customerLastConsumption.entries())
  const BATCH_UPDATE = 1000

  for (let i = 0; i < balanceUpdates.length; i += BATCH_UPDATE) {
    const chunk = balanceUpdates.slice(i, i + BATCH_UPDATE)
    const values = chunk.map(([id, bal]) => `(${id}, ${bal})`).join(",")
    await prisma.$executeRawUnsafe(
      `UPDATE "customer" AS c SET "currentBalance" = v.bal::numeric
       FROM (VALUES ${values}) AS v(id, bal)
       WHERE c.id = v.id;`
    )
  }
  for (let i = 0; i < lastConsumptionUpdates.length; i += BATCH_UPDATE) {
    const chunk = lastConsumptionUpdates.slice(i, i + BATCH_UPDATE)
    const values = chunk.map(([id, d]) => `(${id}, '${d.toISOString().slice(0,10)}'::date)`).join(",")
    await prisma.$executeRawUnsafe(
      `UPDATE "customer" AS c SET "lastConsumption" = v.dt
       FROM (VALUES ${values}) AS v(id, dt)
       WHERE c.id = v.id;`
    )
  }
  console.log(`      → ${affected.size.toLocaleString()} clientes actualizados ✓`)

  // ---------- BILLS ----------
  console.log(`\n🧾 Generando ${cfg.BILLS} gastos...`)
  const bills: any[] = []
  for (let i = 1; i <= cfg.BILLS; i++) {
    const j = jornadaRange[rand(0, jornadaRange.length - 1)]
    const cat = pick(BILL_CATEGORIES)
    bills.push({
      id: i,
      description: pick(cat.descs),
      amount: randFloat(cat.min, cat.max),
      category: cat.cat,
      date: timeAgoDate(j.start, j.end),
      registered_by: rand(1, cfg.USERS),
      jornadaId: j.id,
      receiptUrl: chance(0.3) ? `/uploads/receipts/r_${i}.jpg` : null,
    })
  }
  for (let i = 0; i < bills.length; i += 1000) {
    await prisma.bill.createMany({ data: bills.slice(i, i + 1000) })
  }

  // ---------- SALARY ----------
  console.log(`💵 Generando salarios (${cfg.SALARY_PERIODS} períodos × ${cfg.USERS - 1} staff)...`)
  const salaries: any[] = []
  let salId = 1
  // quincenas dentro del rango
  const totalMs = cfg.END_DATE.getTime() - cfg.START_DATE.getTime()
  const periodMs = totalMs / cfg.SALARY_PERIODS
  for (let p = 0; p < cfg.SALARY_PERIODS; p++) {
    const payDate = new Date(cfg.START_DATE.getTime() + periodMs * (p + 1))
    const label = `Quincena ${String(p + 1).padStart(2, "0")} ${payDate.getFullYear()}`
    for (let u = 2; u <= cfg.USERS; u++) {
      salaries.push({
        id: salId++,
        userID: u,
        amount: randFloat(2500, 6500),
        payDate,
        period: label,
      })
    }
  }
  for (let i = 0; i < salaries.length; i += 1000) {
    await prisma.salary.createMany({ data: salaries.slice(i, i + 1000) })
  }

  // ---------- SAVINGS MOVEMENTS ----------
  console.log(`🐷 Generando ${cfg.SAVINGS_MOVS} movimientos de ahorro...`)
  // Estrategia: empezamos con depósitos para tener balance, después mezclamos.
  // Aseguramos balance ≥ 0 al insertar withdraws.
  const savingsData: any[] = []
  let runningBalance = 0
  for (let i = 1; i <= cfg.SAVINGS_MOVS; i++) {
    const j = jornadaRange[rand(0, jornadaRange.length - 1)]
    const wantsWithdraw = runningBalance > 500 && chance(0.35)
    const amount = wantsWithdraw
      ? randFloat(50, Math.min(runningBalance - 50, 1500))
      : randFloat(100, 2500)
    const type = wantsWithdraw ? SavingsMovementType.WITHDRAW : SavingsMovementType.DEPOSIT
    runningBalance += type === SavingsMovementType.DEPOSIT ? amount : -amount

    savingsData.push({
      id: i,
      amount,
      type,
      description: type === "DEPOSIT" ? "Aporte de cierre de jornada" : "Retiro autorizado",
      createdAt: timeAgoDate(j.start, j.end),
      registered_by: 1, // ADMIN
      jornadaId: j.id,
    })
  }
  for (let i = 0; i < savingsData.length; i += 1000) {
    await prisma.savings_movement.createMany({ data: savingsData.slice(i, i + 1000) })
  }

  // ---------- SAVINGS GOALS + CONTRIBUTIONS ----------
  console.log(`🎯 Generando ${cfg.SAVINGS_GOALS} metas de ahorro + contribuciones...`)
  const goalsData: any[] = []
  for (let i = 1; i <= cfg.SAVINGS_GOALS; i++) {
    const target = randFloat(5000, 80000)
    const deadline = new Date(cfg.END_DATE.getTime() + 1000 * 60 * 60 * 24 * rand(30, 365))
    goalsData.push({
      id: i,
      name: SAVINGS_GOAL_NAMES[(i - 1) % SAVINGS_GOAL_NAMES.length],
      targetAmount: target,
      deadline,
      status: chance(0.1) ? GoalStatus.CANCELLED : (chance(0.3) ? GoalStatus.COMPLETED : GoalStatus.ACTIVE),
      description: `Meta de ahorro generada para pruebas (#${i})`,
      createdAt: timeAgoDate(cfg.START_DATE, cfg.END_DATE),
    })
  }
  await prisma.savings_goal.createMany({ data: goalsData })

  const contribsData: any[] = []
  let cId = 1
  for (const g of goalsData) {
    const num = cfg.CONTRIB_PER_GOAL
    // contribuciones acumulables hasta cerca del target
    const accumTarget = Number(g.targetAmount) * (g.status === GoalStatus.COMPLETED ? 1.05 : randFloat(0.1, 0.8))
    const perContrib = accumTarget / num
    for (let i = 0; i < num; i++) {
      contribsData.push({
        id: cId++,
        goalId: g.id,
        amount: randFloat(perContrib * 0.5, perContrib * 1.5),
        note: chance(0.3) ? "Aportación de jornada" : null,
        createdAt: timeAgoDate(cfg.START_DATE, cfg.END_DATE),
      })
    }
  }
  for (let i = 0; i < contribsData.length; i += 1000) {
    await prisma.goal_contribution.createMany({ data: contribsData.slice(i, i + 1000) })
  }

  // ---------- AJUSTE STOCK DE INSUMOS ----------
  // Recalcula stock realista: stock inicial alto y restamos consumo aproximado
  // (no es exacto, pero refleja desgaste tras 1 año de operación).
  console.log("\n📦 Ajustando stock de insumos para reflejar consumo histórico...")
  await prisma.$executeRawUnsafe(`
    UPDATE "supplies" SET "currentStock" = GREATEST(
      "currentStock" - (RANDOM() * "currentStock" * 0.6),
      5
    );
  `)

  // ---------- SECUENCIAS ----------
  console.log("\n🔧 Sincronizando secuencias de PostgreSQL...")
  const tables = [
    "users","customer","products","supplies","jornada","sales","sale_items",
    "bill","debtors","salary","savings_movement","savings_goal","goal_contribution",
  ]
  for (const t of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"','id'), coalesce(max(id)+1, 1), false) FROM "${t}";`
    )
  }

  // ---------- RESUMEN ----------
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n✅ Seed finalizado en ${elapsed}s`)
  console.log("📈 Resumen:")
  console.log(`   • users:             ${cfg.USERS}`)
  console.log(`   • customers:         ${cfg.CUSTOMERS}`)
  console.log(`   • supplies:          ${cfg.SUPPLIES}`)
  console.log(`   • products:          ${MENU.length}`)
  console.log(`   • recipes:           ${recipesData.length}`)
  console.log(`   • jornadas:          ${cfg.JORNADAS} (1 OPEN, ${cfg.JORNADAS - 1} cerradas)`)
  console.log(`   • sales:             ${sales.length.toLocaleString()}`)
  console.log(`   • sale_items:        ${saleItems.length.toLocaleString()}`)
  console.log(`   • debtors:           ${debtorsData.length.toLocaleString()}`)
  console.log(`   • bills:             ${cfg.BILLS.toLocaleString()}`)
  console.log(`   • salaries:          ${salaries.length.toLocaleString()}`)
  console.log(`   • savings_movement:  ${cfg.SAVINGS_MOVS}`)
  console.log(`   • savings_goal:      ${cfg.SAVINGS_GOALS}`)
  console.log(`   • goal_contribution: ${contribsData.length}`)
  console.log(`\n🔐 Credenciales: admin / Djw9zfq33nl7dgy   (PIN: 1234)`)
}

main()
  .catch(e => {
    console.error("❌ Error durante el seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })