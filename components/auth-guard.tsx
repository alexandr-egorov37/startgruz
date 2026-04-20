'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      // Skip auth check for public routes
      if (pathname === '/' || pathname === '/auth' || pathname === '/form' || pathname === '/results') {
        setLoading(false);
        return;
      }

      // Check if user has phone (authenticated)
      const phone = localStorage.getItem('user_phone');

      if (!phone) {
        window.location.href = '/auth';
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [pathname]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Проверка авторизации...
      </div>
    );
  }

  return children;
}
