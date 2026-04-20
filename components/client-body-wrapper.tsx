'use client';

import { ReactNode } from 'react';
import { RoleSelector } from './role-selector';

interface ClientBodyWrapperProps {
  children: ReactNode;
}

export function ClientBodyWrapper({ children }: ClientBodyWrapperProps) {
  return (
    <>
      {children}
      <RoleSelector />
    </>
  );
}
