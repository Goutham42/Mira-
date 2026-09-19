'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createUploadTicketAction } from '@/actions/admin/media';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Upload a photo and hand back its URL.
 *
 * The file goes from the browser straight to Cloudinary — never through a
 * Server Action, which is capped at 1 MB. The server's only involvement is
 * signing the request.
 *
 * The URL field stays editable beside this: a shop that already hosts its
 * photos somewhere else should not be forced through an upload it does not
 * need.
 */
export function ImageUploadButton({
  folder = 'products',
  onUploaded,
  label = 'Upload',
}: {
  folder?: 'products' | 'categories';
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Use a JPEG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('That image is over 10 MB. Export it smaller and try again.');
      return;
    }

    setBusy(true);
    try {
      const ticket = await createUploadTicketAction({ folder });
      if (!ticket.ok) {
        toast.error(ticket.error.message);
        return;
      }

      const body = new FormData();
      body.append('file', file);
      body.append('api_key', ticket.data.apiKey);
      body.append('timestamp', String(ticket.data.timestamp));
      body.append('folder', ticket.data.folder);
      body.append('signature', ticket.data.signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${ticket.data.cloudName}/image/upload`,
        { method: 'POST', body },
      );

      if (!response.ok) {
        // Cloudinary puts the reason in the body; surface it rather than a bare status.
        const detail = await response.json().catch(() => null);
        toast.error(detail?.error?.message ?? 'Cloudinary rejected the upload.');
        return;
      }

      const result = (await response.json()) as { secure_url?: string };
      if (!result.secure_url) {
        toast.error('Cloudinary did not return an image URL.');
        return;
      }

      onUploaded(result.secure_url);
      toast.success('Image uploaded');
    } catch {
      toast.error('The upload did not go through. Check your connection and try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {busy ? 'Uploading…' : label}
      </Button>
    </>
  );
}
