'use server';

import { revalidatePath } from 'next/cache';

import { run, type ActionResult } from '@/lib/action-result';
import { checkoutSchema } from '@/lib/validation/checkout';
import { placeOrder, type PlaceOrderResult } from '@/server/services/order.service';

/**
 * Place the order.
 *
 * The input carries addresses, contact details and the chosen payment method
 * — never any amount. Totals are recomputed server-side inside `placeOrder`
 * from the cart's current database state.
 */
export async function placeOrderAction(input: unknown): Promise<ActionResult<PlaceOrderResult>> {
  return run(async () => {
    const parsed = checkoutSchema.parse(input);
    const result = await placeOrder(parsed);

    revalidatePath('/cart');
    revalidatePath('/account/orders');
    revalidatePath('/', 'layout');

    return result;
  });
}
