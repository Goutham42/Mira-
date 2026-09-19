import { describe, expect, it } from 'vitest';

import { saveAddressSchema } from '@/lib/validation/address';
import { categorySchema } from '@/lib/validation/product';
import { discountSchema } from '@/lib/validation/discount';

/**
 * The empty hidden id.
 *
 * Every create-or-edit form in the app keeps the record id in a hidden input
 * and reuses one schema for both modes. On a create, that input reads back as
 * `''`, which `cuid().optional()` rejects — and because the field is hidden
 * there is nowhere to show the error, so the form just refuses to submit and
 * the user sees nothing happen at all. Saving a new address and creating a new
 * category were both broken this way.
 *
 * These tests pin the shape the forms actually submit, not the shape the
 * schema authors had in mind.
 */

const address = {
  fullName: 'Asha Menon',
  phone: '9876543210',
  line1: '12 Test Street',
  line2: '',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  postalCode: '641001',
  country: 'IN',
  type: 'SHIPPING' as const,
  isDefaultShipping: false,
  isDefaultBilling: false,
};

describe('an optional id submitted as an empty string', () => {
  it('lets a new address save', () => {
    const result = saveAddressSchema.safeParse({ ...address, id: '' });

    expect(result.success).toBe(true);
    // Absent, rather than an empty string the service would try to look up.
    if (result.success) expect(result.data.id).toBeUndefined();
  });

  it('still accepts a real id when editing', () => {
    const id = 'cmtynfbwr00bylctovt11adat';
    const result = saveAddressSchema.safeParse({ ...address, id });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(id);
  });

  it('still rejects an id that is neither empty nor a cuid', () => {
    const result = saveAddressSchema.safeParse({ ...address, id: 'not-an-id' });
    expect(result.success).toBe(false);
  });

  it('lets a new category save', () => {
    const result = categorySchema.safeParse({ id: '', name: 'Kurtis' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBeUndefined();
  });

  it('lets a new discount code save', () => {
    const result = discountSchema.safeParse({
      id: '',
      code: 'DIWALI20',
      type: 'PERCENT',
      value: 20,
      isActive: true,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBeUndefined();
  });
});
