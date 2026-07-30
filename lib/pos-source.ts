/**
 * The POS encodes which account a sale belongs to in `sales.source_type`:
 *
 *   MESA_4      table 4
 *   CL- Juan    registered customer "Juan"
 *   VL-2        walk-in ticket #2, open (UNPAID) only
 *   VENTA_LIBRE a settled walk-in sale
 *
 * Walk-in customers ("clientes de paso") don't get a customer record and
 * don't take a table, but they can still order several products, so they
 * need an account that adds up and can be charged. That account lives under
 * VL-<n> while it is open; `closeAccountAction` rewrites it to VENTA_LIBRE
 * once it is paid, so reports and history keep grouping walk-in sales the
 * way they always have — and the number becomes free again.
 *
 * Every module that needs to read or build a source_type goes through here,
 * so the prefixes are spelled out in exactly one place.
 */

export const FREE_SALE_SOURCE = "VENTA_LIBRE";
export const FREE_TICKET_PREFIX = "VL-";
export const TABLE_PREFIX = "MESA_";
export const CUSTOMER_PREFIX = "CL- ";

export function freeTicketSource(ticketNumber: number): string {
    return `${FREE_TICKET_PREFIX}${ticketNumber}`;
}

export function tableSource(tableNumber: number): string {
    return `${TABLE_PREFIX}${tableNumber}`;
}

export function customerSource(customerName: string): string {
    return `${CUSTOMER_PREFIX}${customerName}`;
}

export function isFreeTicket(source: string): boolean {
    return freeTicketNumber(source) !== null;
}

/** "VL-2" -> 2. Null for anything that is not a well formed ticket. */
export function freeTicketNumber(source: string): number | null {
    if (!source.startsWith(FREE_TICKET_PREFIX)) return null;
    const parsed = Number(source.slice(FREE_TICKET_PREFIX.length));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * True for the source types that name an open account (one that accumulates
 * UNPAID sales until it is charged), as opposed to settled history.
 */
export function isAccountSource(source: string): boolean {
    return (
        source.startsWith(TABLE_PREFIX) ||
        source.startsWith("CL-") ||
        isFreeTicket(source)
    );
}

/** "MESA_4" -> "Mesa 4", "CL- Juan" -> "Cliente Juan", "VL-2" -> "Venta libre #2" */
export function formatSourceType(source: string): string {
    if (source.startsWith(TABLE_PREFIX)) return `Mesa ${source.slice(TABLE_PREFIX.length)}`;
    if (source.startsWith(CUSTOMER_PREFIX)) return `Cliente ${source.slice(CUSTOMER_PREFIX.length)}`;
    if (source === FREE_SALE_SOURCE) return "Venta libre";

    const ticket = freeTicketNumber(source);
    if (ticket !== null) return `Venta libre #${ticket}`;

    return source;
}

/**
 * Lowest number not currently taken by an open ticket, so several walk-in
 * accounts can be open at once while the numbering stays short and stable
 * (charged tickets give their number back).
 */
export function nextFreeTicketNumber(openTicketNumbers: number[]): number {
    const taken = new Set(openTicketNumbers);
    let candidate = 1;
    while (taken.has(candidate)) candidate++;
    return candidate;
}
