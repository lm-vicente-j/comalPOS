import prisma from "@/lib/prisma";

async function main() {
  const tables = ['sales', 'sale_items', 'supplies', 'customer', 'debtors', 'products', 'users'];

  console.log("--- Starting Sequence Reset ---");

  for (const table of tables) {
    try {

      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 0) + 1, false) 
        FROM "${table}";
      `);
      console.log(` Reset sequence for table: ${table}`);
    } catch (error) {
      console.error(` Failed to reset ${table}`);
    }
  }

  console.log("--- Reset Complete ---");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());