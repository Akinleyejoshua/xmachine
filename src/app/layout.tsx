import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

export const metadata = {
  title: 'xMachine | ML-Studio-Web - End-to-End AI Pipeline Platform',
  description: 'Dynamic ETL, neural network layers builder, live browser-based training, and sandbox playground.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import { Navigation } from '../components/Navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} dark`}>
      <body className="font-sans antialiased bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
