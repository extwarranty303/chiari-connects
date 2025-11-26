'use client';

/**
 * @fileoverview A simple, site-wide footer component.
 * It displays a copyright notice for the application.
 */
export function Footer() {
  return (
    <footer className="w-full py-4 px-8 mt-auto text-center text-xs text-muted-foreground border-t bg-background">
      <p>© 2024 The Chiari Voices Foundation. All rights reserved.</p>
    </footer>
  );
}
