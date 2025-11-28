import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Marlion Admin Dashboard',
  description: 'Admin dashboard for Marlion Winter Internship 2025',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}>
      <body className={inter.className} style={{ backgroundColor: '#f8fafc', color: '#1e293b' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
