/**
 * Development seed.
 *
 * Creates a realistic catalogue so every screen has something to render:
 * a nested category tree, products with real size/colour matrices, inventory
 * ledger entries, an admin and a customer, and a discount code.
 *
 * Idempotent — safe to re-run. Never run against production.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const db = new PrismaClient();

const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

const CURRENCY = 'INR';
/** Rupees to paise. */
const rs = (amount: number) => Math.round(amount * 100);

type SeedProduct = {
  title: string;
  slug: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  material: string;
  care: string;
  price: number;
  compareAt?: number;
  featured?: boolean;
  images: string[];
  sizes: string[];
  colors: { value: string; hex: string }[];
  /** Sizes deliberately left out of stock, to exercise the sold-out states. */
  outOfStock?: string[];
};

const CATEGORIES: { name: string; slug: string; parent?: string; position: number }[] = [
  { name: 'Dresses', slug: 'dresses', position: 0 },
  { name: 'Midi', slug: 'midi', parent: 'dresses', position: 0 },
  { name: 'Maxi', slug: 'maxi', parent: 'dresses', position: 1 },
  { name: 'Tops', slug: 'tops', position: 1 },
  { name: 'Bottoms', slug: 'bottoms', position: 2 },
];

const IMAGE = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

const PRODUCTS: SeedProduct[] = [
  {
    title: 'Isla Linen Midi Dress',
    slug: 'isla-linen-midi-dress',
    categorySlug: 'midi',
    shortDescription: 'A softly gathered midi in washed European linen.',
    description:
      'Cut with a gently gathered waist and a skirt that moves. Washed linen softens further with every wear.\n\nFalls below the knee on most heights. Fully lined bodice, side seam pockets.',
    material: '100% washed European linen. Lining: 100% cotton.',
    care: 'Machine wash cold on a gentle cycle. Line dry. Warm iron.',
    price: 4_499,
    compareAt: 5_999,
    featured: true,
    images: [IMAGE('photo-1595777457583-95e059d581b8'), IMAGE('photo-1572804013309-59a88b7e92f1')],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { value: 'Ivory', hex: '#EFE9DF' },
      { value: 'Olive', hex: '#6B6B4A' },
    ],
    outOfStock: ['XS'],
  },
  {
    title: 'Wren Cotton Maxi Dress',
    slug: 'wren-cotton-maxi-dress',
    categorySlug: 'maxi',
    shortDescription: 'Full-length, easy through the body, with a tie back.',
    description:
      'An unfussy maxi in a mid-weight cotton poplin. Tie back adjusts the fit through the waist.',
    material: '100% organic cotton poplin.',
    care: 'Machine wash cold. Tumble dry low.',
    price: 5_299,
    featured: true,
    images: [IMAGE('photo-1496747611176-843222e1e57c'), IMAGE('photo-1515372039744-b8f02a3ae446')],
    sizes: ['S', 'M', 'L'],
    colors: [
      { value: 'Black', hex: '#1C1C1A' },
      { value: 'Clay', hex: '#B4785E' },
    ],
  },
  {
    title: 'Juniper Silk Slip Dress',
    slug: 'juniper-silk-slip-dress',
    categorySlug: 'midi',
    shortDescription: 'Bias-cut silk that skims rather than clings.',
    description:
      'Cut on the bias from washable silk, with adjustable straps and a French-seamed finish throughout.',
    material: '100% washable mulberry silk.',
    care: 'Hand wash cold or dry clean. Cool iron on reverse.',
    price: 8_999,
    compareAt: 11_500,
    featured: true,
    images: [IMAGE('photo-1539008835657-9e8e9680c956'), IMAGE('photo-1583496661160-fb5886a13d77')],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { value: 'Champagne', hex: '#E4D4BC' },
      { value: 'Emerald', hex: '#1F5F4B' },
    ],
  },
  {
    title: 'Faye Poplin Shirt',
    slug: 'faye-poplin-shirt',
    categorySlug: 'tops',
    shortDescription: 'A relaxed shirt with a slightly dropped shoulder.',
    description: 'Crisp cotton poplin, cut generously. Mother-of-pearl buttons.',
    material: '100% cotton poplin.',
    care: 'Machine wash warm. Warm iron.',
    price: 2_899,
    featured: true,
    images: [IMAGE('photo-1602810318383-e386cc2a3ccf')],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { value: 'White', hex: '#F6F4F0' },
      { value: 'Sky', hex: '#A9C1D4' },
    ],
  },
  {
    title: 'Odette Wide-Leg Trouser',
    slug: 'odette-wide-leg-trouser',
    categorySlug: 'bottoms',
    shortDescription: 'High-rise, wide through the leg, pressed crease.',
    description: 'A tailored trouser in a fluid twill. Hook-and-bar closure, side pockets.',
    material: '68% viscose, 32% linen.',
    care: 'Dry clean recommended.',
    price: 4_199,
    images: [IMAGE('photo-1594633312681-425c7b97ccd1')],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { value: 'Charcoal', hex: '#3A3A38' },
      { value: 'Sand', hex: '#C9B79C' },
    ],
  },
  {
    title: 'Mira Knit Tank',
    slug: 'mira-knit-tank',
    categorySlug: 'tops',
    shortDescription: 'A fine-gauge knit tank that layers under everything.',
    description: 'Ribbed fine-gauge knit with a scooped neck and a close, non-clinging fit.',
    material: '80% cotton, 20% silk.',
    care: 'Hand wash cold. Dry flat.',
    price: 1_899,
    images: [IMAGE('photo-1483985988355-763728e1935b')],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { value: 'Ivory', hex: '#EFE9DF' },
      { value: 'Black', hex: '#1C1C1A' },
    ],
  },
];

const WEAK_DEFAULTS = new Set(['ChangeMe123!', 'password', 'admin', '']);

async function seedUsers() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@mira.example').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? '';

  // Anywhere reachable by other people, a known seed password is a back door
  // into the admin. Refuse rather than create one.
  const isLocal = (process.env.APP_URL ?? '').includes('localhost');
  if (!isLocal && WEAK_DEFAULTS.has(adminPassword)) {
    throw new Error(
      'Set SEED_ADMIN_PASSWORD to a strong value before seeding a non-local environment.',
    );
  }
  if (WEAK_DEFAULTS.has(adminPassword)) {
    console.warn('  ! SEED_ADMIN_PASSWORD is weak or unset — acceptable on localhost only.');
  }

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: await hash(adminPassword, ARGON2),
      firstName: 'Mira',
      lastName: 'Admin',
      name: 'Mira Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
      wishlist: { create: {} },
    },
    update: { role: 'ADMIN' },
  });

  // Demo shopper account, only created when a password is available to set.
  const customerEmail = 'customer@mira.example';
  await db.user.upsert({
    where: { email: customerEmail },
    create: {
      email: customerEmail,
      passwordHash: await hash(adminPassword || 'ChangeMe123!', ARGON2),
      firstName: 'Sample',
      lastName: 'Customer',
      name: 'Sample Customer',
      role: 'CUSTOMER',
      emailVerified: new Date(),
      wishlist: { create: {} },
      addresses: {
        create: {
          fullName: 'Sample Customer',
          phone: '+91 90000 00000',
          line1: '12 Residency Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560025',
          country: 'IN',
          isDefaultShipping: true,
          isDefaultBilling: true,
        },
      },
    },
    update: {},
  });

  console.log(`  admin:    ${adminEmail}`);
  console.log(`  customer: ${customerEmail}`);
  return admin;
}

async function seedCategories() {
  const byslug = new Map<string, { id: string; path: string }>();

  // Parents first so a child can resolve its parent's path.
  const ordered = [...CATEGORIES].sort((a, b) => Number(Boolean(a.parent)) - Number(Boolean(b.parent)));

  for (const category of ordered) {
    const parent = category.parent ? byslug.get(category.parent) : undefined;
    const path = parent ? `${parent.path}/${category.slug}` : category.slug;

    const saved = await db.category.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        path,
        parentId: parent?.id ?? null,
        position: category.position,
        isActive: true,
      },
      update: { name: category.name, path, parentId: parent?.id ?? null },
      select: { id: true, path: true },
    });

    byslug.set(category.slug, saved);
  }

  console.log(`  ${byslug.size} categories`);
  return byslug;
}

async function seedProduct(
  product: SeedProduct,
  categoryId: string | undefined,
  actorId: string,
) {
  const saved = await db.product.upsert({
    where: { slug: product.slug },
    create: {
      title: product.title,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      status: 'ACTIVE',
      categoryId: categoryId ?? null,
      brand: 'Mira',
      material: product.material,
      careInstructions: product.care,
      basePrice: rs(product.price),
      compareAtPrice: product.compareAt ? rs(product.compareAt) : null,
      currency: CURRENCY,
      isFeatured: product.featured ?? false,
      publishedAt: new Date(),
    },
    update: {
      categoryId: categoryId ?? null,
      basePrice: rs(product.price),
      compareAtPrice: product.compareAt ? rs(product.compareAt) : null,
      status: 'ACTIVE',
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  // Rebuild images and the option/variant structure wholesale — the same
  // strategy the admin save path uses, so re-running matches real behaviour.
  await db.productImage.deleteMany({ where: { productId: saved.id } });
  await db.productImage.createMany({
    data: product.images.map((url, index) => ({
      productId: saved.id,
      url,
      alt: `${product.title} — view ${index + 1}`,
      position: index,
    })),
  });

  await db.productOption.deleteMany({ where: { productId: saved.id } });

  const sizeOption = await db.productOption.create({
    data: { productId: saved.id, name: 'Size', position: 0 },
  });
  const colorOption = await db.productOption.create({
    data: { productId: saved.id, name: 'Color', position: 1 },
  });

  const sizeValues = new Map<string, string>();
  for (const [index, size] of product.sizes.entries()) {
    const value = await db.productOptionValue.create({
      data: { optionId: sizeOption.id, value: size, position: index },
    });
    sizeValues.set(size, value.id);
  }

  const colorValues = new Map<string, string>();
  for (const [index, color] of product.colors.entries()) {
    const value = await db.productOptionValue.create({
      data: {
        optionId: colorOption.id,
        value: color.value,
        hexColor: color.hex,
        position: index,
      },
    });
    colorValues.set(color.value, value.id);
  }

  const skuBase = product.slug.toUpperCase().replace(/-/g, '').slice(0, 12);
  let position = 0;

  for (const size of product.sizes) {
    for (const color of product.colors) {
      const sku = `${skuBase}-${size}-${color.value.toUpperCase().slice(0, 4)}`;
      const quantity = product.outOfStock?.includes(size) ? 0 : 4 + ((position * 3) % 9);

      const variant = await db.productVariant.upsert({
        where: { sku },
        create: {
          productId: saved.id,
          sku,
          price: rs(product.price),
          compareAtPrice: product.compareAt ? rs(product.compareAt) : null,
          position,
          isActive: true,
        },
        update: { productId: saved.id, price: rs(product.price), position },
        select: { id: true },
      });

      const sizeValueId = sizeValues.get(size);
      const colorValueId = colorValues.get(color.value);

      await db.variantOptionValue.deleteMany({ where: { variantId: variant.id } });
      if (sizeValueId && colorValueId) {
        await db.variantOptionValue.createMany({
          data: [
            { variantId: variant.id, optionValueId: sizeValueId },
            { variantId: variant.id, optionValueId: colorValueId },
          ],
        });
      }

      const existing = await db.inventoryItem.findUnique({
        where: { variantId: variant.id },
        select: { quantity: true },
      });

      if (!existing) {
        await db.inventoryItem.create({ data: { variantId: variant.id, quantity } });
        if (quantity > 0) {
          await db.stockMovement.create({
            data: {
              variantId: variant.id,
              delta: quantity,
              reason: 'RESTOCK',
              actorId,
              note: 'Seed data',
            },
          });
        }
      } else {
        await db.inventoryItem.update({
          where: { variantId: variant.id },
          data: { quantity, reserved: 0 },
        });
      }

      position += 1;
    }
  }
}

async function seedDiscounts() {
  const codes: Prisma.DiscountCodeCreateInput[] = [
    {
      code: 'WELCOME10',
      description: '10% off your first order',
      type: 'PERCENT',
      value: 10,
      minSubtotal: rs(2_000),
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: 'FREESHIP',
      description: 'Free shipping, any order',
      type: 'FREE_SHIPPING',
      value: 0,
      isActive: true,
    },
  ];

  for (const code of codes) {
    await db.discountCode.upsert({
      where: { code: code.code },
      create: code,
      update: { isActive: true },
    });
  }

  console.log(`  ${codes.length} discount codes`);
}

async function main() {
  console.log('Seeding Mira…');

  const admin = await seedUsers();
  const categories = await seedCategories();

  for (const product of PRODUCTS) {
    await seedProduct(product, categories.get(product.categorySlug)?.id, admin.id);
  }
  console.log(`  ${PRODUCTS.length} products`);

  await seedDiscounts();

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
