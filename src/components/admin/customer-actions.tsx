'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole, UserStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  revokeCustomerSessionsAction,
  setCustomerRoleAction,
  setCustomerStatusAction,
} from '@/actions/admin/customers';

/**
 * Per-customer controls.
 *
 * Suspension and role changes both sign the person out everywhere, so the
 * confirmation says so — an admin who does not expect that would read the
 * sudden logout as a bug.
 */
export function CustomerActions({
  userId,
  email,
  role,
  status,
  isSelf,
}: {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? 'Something went wrong');
    });
  }

  const roleOptions: UserRole[] = ['CUSTOMER', 'STAFF', 'ADMIN'];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            aria-label={`Manage ${email}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {roleOptions
            .filter((option) => option !== role)
            .map((option) => (
              <DropdownMenuItem
                key={option}
                onSelect={() =>
                  run(
                    () => setCustomerRoleAction({ userId, role: option }),
                    `${email} is now ${option.toLowerCase()}`,
                  )
                }
              >
                Make {option.toLowerCase()}
              </DropdownMenuItem>
            ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() =>
              run(
                () => revokeCustomerSessionsAction({ userId }),
                'Signed out of every device',
              )
            }
          >
            Sign out everywhere
          </DropdownMenuItem>

          {status === 'SUSPENDED' ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => setCustomerStatusAction({ userId, status: 'ACTIVE' }),
                  `${email} reinstated`,
                )
              }
            >
              Reinstate account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={() => setConfirmSuspend(true)}
              className="text-destructive"
            >
              Suspend account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <DialogContent
          title={`Suspend ${email}?`}
          description="They are signed out of every device immediately and cannot sign in or order until reinstated. Their past orders are untouched."
        >
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmSuspend(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => {
                setConfirmSuspend(false);
                run(
                  () => setCustomerStatusAction({ userId, status: 'SUSPENDED' }),
                  `${email} suspended`,
                );
              }}
            >
              Suspend account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
