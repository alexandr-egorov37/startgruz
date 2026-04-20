'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';

export default function ExecutorPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to performer dashboard for now
    router.push('/performer/dashboard');
  }, [router]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    </AuthGuard>
  );
}
