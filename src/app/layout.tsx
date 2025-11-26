import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Footer } from '@/components/app/footer';

export const metadata: Metadata = {
  title: 'Chiari Connects',
  description: 'A community platform for Chiari malformation support, symptom tracking, and discussion.',
};

/**
 * @fileoverview This is the root layout for the entire application.
 *
 * It wraps all pages with essential providers and global styles.
 * Key responsibilities include:
 * - Setting up the HTML structure (html, head, body).
 * - Importing global CSS stylesheets.
 * - Loading custom fonts from Google Fonts.
 * - Wrapping the application with `FirebaseClientProvider` to ensure Firebase is initialized on the client-side.
 * - Including the `Toaster` component for displaying notifications.
 * - Adding a consistent `Footer` to all pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <FirebaseClientProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
