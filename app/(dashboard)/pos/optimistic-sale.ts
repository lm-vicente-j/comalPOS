import { Sale } from "@/lib/actions/sales";
import { Product } from "@/lib/actions/schemas";

// Placeholder the UI shows in the same instant a product is tapped, while
// createSale registers the real one on the server. When the revalidated
// page data arrives, useOptimistic swaps the placeholder for the real sale.
//
// Negative ids mark the placeholder (database ids are always positive):
// quantity steppers and the trash button stay disabled on those lines
// because updating or cancelling needs the real sale id.
export function makeOptimisticSale(id: number, product: Product, sourceType: string): Sale {
    const price = Number(product.price);
    return {
        id,
        customerID: 0,
        placedBy: 0,
        status: "UNPAID",
        source_type: sourceType,
        total: price,
        createdAt: new Date().toISOString(),
        sale_items: [
            {
                productID: product.id ?? 0,
                quantity: 1,
                unitPrice: price,
                subtotal: price,
                products: { id: product.id ?? 0, name: product.name, price },
            },
        ],
    };
}

export function isOptimisticSale(sale: Sale): boolean {
    return sale.id < 0;
}
