'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-6 p-8">
        <h2 className="text-2xl font-bold text-white">Что-то пошло не так!</h2>
        <p className="text-slate-400 max-w-md">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        <div className="space-y-4">
          <button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Попробовать снова
          </button>
          <div>
            <button
              onClick={() => window.location.reload()}
              className="border border-white/20 text-white hover:bg-white/10 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Обновить страницу
            </button>
          </div>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left text-slate-500 text-sm mt-8">
            <summary>Детали ошибки (разработка)</summary>
            <pre className="mt-2 p-4 bg-slate-900 rounded overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
