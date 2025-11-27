'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileUp, FileDown, Activity, MessageSquare, Menu, LogOut } from 'lucide-react';
import { UserNav } from '@/components/app/user-nav';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Logo } from './logo';

/**
 * @fileoverview AppHeader component serves as the main navigation bar for the application.
 * It provides a responsive navigation experience, displaying key links and user actions.
 *
 * Key functionalities:
 * - **Logo and Branding**: Displays the "Chiari Connects" logo, linking to the home page.
 * - **Desktop Navigation**: Shows primary navigation links (Discussions, Symptom Tracker) on larger screens.
 * - **Mobile Navigation**: On smaller screens, it collapses navigation into a slide-out sheet menu for better usability.
 * - **User Actions**: Integrates the `UserNav` component for user-specific actions like profile and logout.
 * - **Placeholder Actions**: Includes "Upload" and "Download" buttons as placeholders for potential future file-handling features.
 *
 * @param {AppHeaderProps} props - The props for the AppHeader component.
 * @param {() => void} props.onUploadClick - Callback function for the placeholder upload button.
 * @param {() => void} props.onDownloadClick - Callback function for the placeholder download button.
 * @param {boolean} [props.showActions=true] - Whether to show the Upload/Download buttons.
 * @returns {React.ReactElement} The responsive header component for the application.
 */

type AppHeaderProps = {
  onUploadClick: () => void;
  onDownloadClick: () => void;
  showActions?: boolean;
};

export function AppHeader({ onUploadClick, onDownloadClick, showActions = true }: AppHeaderProps) {
  const { auth } = useFirebase();
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut().then(() => {
      router.push('/');
    });
  };
  
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card/60 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-x-8">
        <Link href="/" className="flex items-center">
           <Logo width={221.625} height={44.4375} />
        </Link>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
                <Link href="/discussions">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Discussions
                </Link>
            </Button>
            <Button variant="ghost" asChild>
                <Link href="/symptom-tracker">
                    <Activity className="mr-2 h-4 w-4" />
                    Symptom Tracker
                </Link>
            </Button>
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        {showActions && (
          <div className="hidden md:flex items-center gap-2">
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
        <div className="hidden md:block">
          <UserNav />
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader className="text-left">
                        <SheetTitle>Navigation</SheetTitle>
                        <SheetDescription>
                            Quickly access other pages in the application.
                        </SheetDescription>
                    </SheetHeader>
                    <nav className="flex flex-col gap-4 mt-8">
                         <Button variant="ghost" asChild className="justify-start">
                            <Link href="/discussions">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Discussions
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="justify-start">
                            <Link href="/symptom-tracker">
                                <Activity className="mr-2 h-4 w-4" />
                                Symptom Tracker
                            </Link>
                        </Button>
                         {showActions && (
                            <>
                                <Button variant="outline" onClick={onUploadClick} className="justify-start">
                                <FileUp className="mr-2 h-4 w-4" />
                                Upload
                                </Button>
                                <Button onClick={onDownloadClick} className="justify-start">
                                <FileDown className="mr-2 h-4 w-4" />
                                Download
                                </Button>
                            </>
                         )}
                        <hr className="my-4" />
                        <div className="flex justify-center mb-4">
                            <UserNav />
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="justify-center">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>

      </div>
    </header>
  );
}
