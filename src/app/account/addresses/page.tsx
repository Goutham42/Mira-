import type { Metadata } from 'next';

import { AddressBook } from '@/components/forms/address-book';
import { listAddresses } from '@/server/services/user.service';

export const metadata: Metadata = {
  title: 'Addresses',
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const addresses = await listAddresses();

  return (
    <AddressBook
      addresses={addresses.map((address) => ({
        id: address.id,
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefaultShipping: address.isDefaultShipping,
        isDefaultBilling: address.isDefaultBilling,
      }))}
    />
  );
}
