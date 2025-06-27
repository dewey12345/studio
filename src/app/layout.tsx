import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Header from '@/components/header';

export const metadata: Metadata = {
  title: 'Color Clash',
  description: 'A real-time color trading game.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-background dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full font-body antialiased">
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
