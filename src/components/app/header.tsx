'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileUp, FileDown, Activity } from 'lucide-react';
import { UserNav } from '@/components/app/user-nav';
import { Icons } from '@/components/app/icons';

/**
 * @fileoverview AppHeader component serves as the main navigation bar for the application.
 * It displays the application logo and title, action buttons for placeholder features
 * (file upload/download), a link to the Symptom Tracker, and the user navigation menu.
 *
 * @param {AppHeaderProps} props - The props for the AppHeader component.
 * @param {() => void} props.onUploadClick - Callback function to trigger file upload.
 * @param {() => void} props.onDownloadClick - Callback function to trigger file download.
 * @param {boolean} [props.showActions=true] - Whether to show the Upload/Download buttons.
 * @returns {React.ReactElement} The header component for the application.
 */

type AppHeaderProps = {
  onUploadClick: () => void;
  onDownloadClick: () => void;
  showActions?: boolean;
};

export function AppHeader({ onUploadClick, onDownloadClick, showActions = true }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Icons.logo className="w-10 h-10 text-primary" />
          <h1 className="text-xl font-semibold font-headline tracking-tight text-foreground">
            Chiari Connects
          </h1>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
                <Link href="/symptom-tracker">
                    <Activity className="mr-2 h-4 w-4" />
                    Symptom Tracker
                </Link>
            </Button>
        </nav>
        {showActions && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onUploadClick}>
              <FileUp className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button onClick={onDownloadClick}>
              <FileDown className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        )}
        <UserNav />
      </div>
    </header>
  );
}

    