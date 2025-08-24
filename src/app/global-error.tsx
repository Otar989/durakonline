"use client";
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-6 bg-neutral-900 text-neutral-100">
        <div className="space-y-4 max-w-md text-center">
          <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
          {error?.message && (
            <p className="text-sm text-neutral-400 break-words">{error.message}</p>
          )}
          <button
            onClick={() => (window.location.href = '/')}
            className="px-4 py-2 rounded bg-neutral-100 text-neutral-900 font-medium hover:bg-white transition"
          >
            На главную
          </button>
        </div>
      </body>
    </html>
  );
}
