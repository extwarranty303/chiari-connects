'use client';

import { Button } from '@/components/ui/button';
import { FileUp, FileDown } from 'lucide-react';
import { Icons } from '@/components/app/icons';
import { UserNav } from '@/components/app/user-nav';

type AppHeaderProps = {
  onUploadClick: () => void;
  onDownloadClick: () => void;
};

export function AppHeader({ onUploadClick, onDownloadClick }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Icons.logo className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold font-headline tracking-tight text-foreground">
          React Refinery
        </h1>
      </div>
      <div className="flex items-center gap-4">
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
        <UserNav />
      </div>
    </header>
  );
}
