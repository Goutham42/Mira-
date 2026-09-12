import { ProductForm } from '@/components/admin/product-form';
import { listCategoriesForAdmin } from '@/server/services/category.service';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const categories = await listCategoriesForAdmin();

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved as a draft unless you set the status to Active.
        </p>
      </header>

      <ProductForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          path: category.path,
        }))}
      />
    </div>
  );
}
