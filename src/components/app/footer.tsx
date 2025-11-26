'use client';

/**
 * @fileoverview A simple, site-wide footer component.
 * It is designed to be placed at the bottom of the main layout and displays
 * a copyright notice for the application.
 */
export function Footer() {
  return (
    <footer className="w-full py-4 px-8 mt-auto text-center text-xs text-muted-foreground border-t bg-background/50 backdrop-blur-sm print:hidden">
      <p>© 2024 The Chiari Voices Foundation. All rights reserved.</p>
    </footer>
  );
}
