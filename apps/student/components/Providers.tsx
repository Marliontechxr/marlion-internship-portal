'use client';

import { AuthProvider } from '@marlion/ui/providers';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>{children}</AuthProvider>
  );
}
