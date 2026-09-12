'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { categorySchema, type CategoryInput } from '@/lib/validation/product';
import { deleteCategoryAction, saveCategoryAction } from '@/actions/admin/catalog';

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
};

const BLANK: CategoryInput = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  imageUrl: '',
  isActive: true,
  position: 0,
};

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [editing, setEditing] = useState<CategoryInput | null>(null);
  const [isDeleting, startDelete] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nesting is derived from the parent. Renaming rewrites descendant paths.
          </p>
        </div>

        <Button onClick={() => setEditing(BLANK)}>
          <Plus />
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-lg border bg-surface px-5 py-12 text-center text-sm text-muted-foreground">
          No categories yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  {!category.isActive ? <Badge variant="warning">Hidden</Badge> : null}
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  /c/{category.path}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  {category.productCount} product{category.productCount === 1 ? '' : 's'}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: category.id,
                      name: category.name,
                      slug: category.slug,
                      description: '',
                      parentId: category.parentId ?? '',
                      imageUrl: '',
                      isActive: category.isActive,
                      position: category.position,
                    })
                  }
                  className="underline underline-offset-4 hover:text-accent"
                >
                  Edit
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() =>
                    startDelete(async () => {
                      const result = await deleteCategoryAction({ id: category.id });
                      if (result.ok) toast.success('Category removed');
                      else toast.error(result.error.message);
                    })
                  }
                  className="text-destructive underline underline-offset-4"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent
            title={editing.id ? 'Edit category' : 'New category'}
            description="Categories drive storefront navigation and filtering."
          >
            <CategoryForm
              defaults={editing}
              categories={categories}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function CategoryForm({
  defaults,
  categories,
  onSaved,
  onCancel,
}: {
  defaults: CategoryInput;
  categories: AdminCategory[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaults,
  });

  const isActive = watch('isActive');

  // A category cannot be its own parent, nor a descendant of itself.
  const parentOptions = categories.filter(
    (candidate) =>
      candidate.id !== defaults.id &&
      !(defaults.id && candidate.path.startsWith(`${defaults.slug}/`)),
  );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await saveCategoryAction(values);
        if (result.ok) {
          toast.success('Category saved');
          onSaved();
        } else {
          setFormError(result.error.message);
        }
      })}
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <input type="hidden" {...register('id')} />

      <Field label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" autoFocus invalid={Boolean(errors.name)} {...register('name')} />
      </Field>

      <Field
        label="Slug"
        htmlFor="categorySlug"
        error={errors.slug?.message}
        description="Leave blank to generate from the name"
      >
        <Input id="categorySlug" {...register('slug')} />
      </Field>

      <Field label="Parent" htmlFor="parentId" error={errors.parentId?.message}>
        <select
          id="parentId"
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
          {...register('parentId')}
        >
          <option value="">Top level</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.path}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={3} {...register('description')} />
      </Field>

      <Field
        label="Position"
        htmlFor="position"
        error={errors.position?.message}
        description="Lower numbers sort first"
      >
        <Input id="position" inputMode="numeric" {...register('position')} />
      </Field>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setValue('isActive', checked === true)}
        />
        <Label htmlFor="isActive" className="font-normal">
          Visible on the storefront
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save category
        </Button>
      </div>
    </form>
  );
}
