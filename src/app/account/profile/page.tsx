import type { Metadata } from 'next';

import { Separator } from '@/components/ui/separator';
import { ChangePasswordForm, ProfileForm } from '@/components/forms/profile-form';
import { getProfile } from '@/server/services/user.service';

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div className="max-w-lg space-y-10">
      <section>
        <h2 className="text-2xl">Your details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {profile.email}
        </p>

        <div className="mt-6">
          <ProfileForm
            defaults={{
              firstName: profile.firstName ?? '',
              lastName: profile.lastName ?? '',
              phone: profile.phone ?? '',
              marketingOptIn: profile.marketingOptIn,
            }}
          />
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="text-2xl">Password</h2>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
