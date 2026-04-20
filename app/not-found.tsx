'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-8 p-8 max-w-md">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-yellow-500">404</h1>
          <h2 className="text-2xl font-bold text-white">Страница не найдена</h2>
          <p className="text-slate-400">
            Страница, которую вы ищете, не существует или была перемещена.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors">
              На главную
            </button>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="border border-white/20 text-white hover:bg-white/10 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Назад
          </button>
        </div>
        
        <div className="text-slate-500 text-sm">
          Если вы считаете, что это ошибка, пожалуйста, свяжитесь с поддержкой.
        </div>
      </div>
    </div>
  );
}
