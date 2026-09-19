import 'server-only';
import { createHash } from 'node:crypto';

import { env } from '@/config/env';
import { badRequest } from '@/server/errors';

/**
 * Signed direct-to-Cloudinary uploads.
 *
 * The browser uploads straight to Cloudinary; the file never passes through a
 * Vercel function. That keeps us inside the 1 MB Server Action body limit set
 * in next.config.ts and means a 6 MB product photo does not pay for function
 * execution time on the way past.
 *
 * What the server does is sign the request. An unsigned preset would let
 * anyone who reads the page source upload into the account, so the signature —
 * which requires the API secret, and expires — is the access control.
 *
 * No SDK: the whole protocol is a SHA-1 of the sorted parameters plus the API
 * secret, and a dependency for that is a dependency to keep patched.
 */

export type UploadTicket = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export function isMediaConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Sign one upload.
 *
 * Cloudinary rejects a signature whose timestamp is more than an hour old, so
 * a leaked ticket is short-lived, and it is scoped to a folder we choose
 * rather than one the client asks for.
 */
export function createUploadTicket(folder = 'products'): UploadTicket {
  if (!isMediaConfigured()) {
    throw badRequest(
      'Image uploads are not configured. Add the Cloudinary keys to the environment, or paste an image URL instead.',
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const safeFolder = `mira/${folder.replace(/[^a-z0-9/_-]/gi, '')}`;

  // Cloudinary signs the parameters it receives, sorted by key, joined as a
  // query string, with the API secret appended. Keep this in step with what
  // the client actually sends.
  const params = `folder=${safeFolder}&timestamp=${timestamp}`;
  const signature = createHash('sha1')
    .update(`${params}${env.CLOUDINARY_API_SECRET}`)
    .digest('hex');

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    folder: safeFolder,
    signature,
  };
}
