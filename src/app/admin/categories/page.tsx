import { CategoryManager } from '@/components/admin/category-manager';
import { listCategoriesForAdmin } from '@/server/services/category.service';

export const metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesForAdmin();

  return (
    <CategoryManager
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        path: category.path,
        parentId: category.parentId,
        position: category.position,
        isActive: category.isActive,
        productCount: category._count.products,
      }))}
    />
  );
}
