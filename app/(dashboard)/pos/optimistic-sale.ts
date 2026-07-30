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

// Every instant update the POS can apply to its sales before the server
// confirms: a tapped product, a quantity change from the steppers, or a
// deleted line. The server action's revalidated payload replaces the
// optimistic result when it lands, so both stay consistent.
export type SalesOptimisticAction =
    | { type: "add"; sale: Sale }
    | { type: "remove"; saleId: number }
    | { type: "setQuantity"; saleId: number; productId: number; quantity: number };

export function salesOptimisticReducer(current: Sale[], action: SalesOptimisticAction): Sale[] {
    switch (action.type) {
        case "add":
            return [action.sale, ...current];
        case "remove":
            return current.filter((sale) => sale.id !== action.saleId);
        case "setQuantity":
            // Mirrors updateSaleQuantity: less than one cancels the sale.
            if (action.quantity < 1) {
                return current.filter((sale) => sale.id !== action.saleId);
            }
            return current.map((sale) => {
                if (sale.id !== action.saleId) return sale;
                const items = sale.sale_items.map((item) =>
                    item.productID === action.productId
                        ? { ...item, quantity: action.quantity, subtotal: Number(item.unitPrice) * action.quantity }
                        : item
                );
                return {
                    ...sale,
                    sale_items: items,
                    total: items.reduce((acc, item) => acc + Number(item.subtotal), 0),
                };
            });
    }
}
