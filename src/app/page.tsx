'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app/header';
import { CodeEditor } from '@/components/app/code-editor';
import { AiPanel } from '@/components/app/ai-panel';
import { useToast } from "@/hooks/use-toast"
import { useUser } from '@/firebase';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Footer } from '@/components/app/footer';

/**
 * @fileoverview This is the main page of the Chiari Connects application, serving as a placeholder workspace.
 * In a previous version of the app, this was `ReactRefinery`, a tool for code analysis. The UI elements
 * for code editing and AI analysis remain as examples of potential app functionality, but are not the
 * primary focus of the current `Chiari Connects` application.
 *
 * Key functionalities (from the placeholder UI):
 * - **Authentication Check**: Redirects unauthenticated users to the login page.
 * - **File Handling**: Allows users to upload and download text files.
 * - **Code Editor**: A central `CodeEditor` component to view and modify text.
 * - **AI Panel**: An `AiPanel` that demonstrates AI features like code refactoring and generation.
 * - **State Management**: Manages the state of the text content and the current file name.
 * - **User Feedback**: Uses toasts to provide feedback for actions like file uploads and downloads.
 * - **Medical Disclaimer**: Displays a prominent disclaimer about the informational nature of the app.
 */

// Default content for the editor, providing a welcome message and basic instructions.
const defaultCode = `import React from 'react';

const MyComponent = () => {
  const [count, setCount] = React.useState(0);

  // A simple component to demonstrate the editor
  return (
    <div style={{padding: '20px', border: '1px solid #ccc', borderRadius: '8px'}}>
      <h2>Welcome to Chiari Connects!</h2>
      <p>This area is a placeholder for future features.</p>
      <p>The main functionality is the Symptom Tracker.</p>
      <button onClick={() => setCount(count + 1)}>
        Increment: {count}
      </button>
    </div>
  );
};

export default MyComponent;
`;

/**
 * The main page component for the application. It orchestrates the primary user workspace,
 * including authentication checks, file operations, and the layout of the main UI components.
 *
 * @returns {React.ReactElement} The rendered main page.
 */
export default function MainPage() {
  const [code, setCode] = useState<string>(defaultCode);
  const [fileName, setFileName] = useState<string>('example.jsx');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Effect to handle authentication. Redirects to '/auth' if the user is not logged in.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  /**
   * Handles the file upload event. Reads the content of the selected file,
   * and loads it into the editor.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation for text-based files, though the editor can display any text.
       if (file.name.endsWith('.jsx') || file.name.endsWith('.js') || file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setCode(text);
          setFileName(file.name);
          toast({
            title: "File Uploaded",
            description: `${file.name} has been loaded into the editor.`,
          })
        };
        reader.readAsText(file);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid text file.",
        })
      }
    }
    // Reset file input to allow uploading the same file again if needed.
    if(event.target) {
        event.target.value = '';
    }
  };

  /**
   * Programmatically triggers the hidden file input element to open the file dialog.
   */
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  /**
   * Handles the download of the current content in the editor as a file.
   */
  const handleCodeDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Download Started",
      description: `Your file ${fileName} is being downloaded.`,
    })
  };

  /**
   * Appends new content to the editor, used by the AI Panel.
   * @param {string} newCode - The new code or text to append.
   * @param {'component' | 'suggestion'} type - The type of content being added, for a descriptive comment.
   */
  const handleAppendToEditor = useCallback((newCode: string, type: 'component' | 'suggestion') => {
    const comment = type === 'component' ? 'Generated Component' : 'AI Suggestion';
    setCode(currentCode => `${currentCode}\n\n/* --- ${comment} --- */\n${newCode}`);
    toast({
        title: type === 'component' ? 'Component Added' : 'Code Added',
        description: `The new code has been appended to the editor.`,
    })
  }, []);

  // Show a loading screen while user authentication is in progress.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader
        onUploadClick={triggerFileUpload}
        onDownloadClick={handleCodeDownload}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".js,.jsx,.ts,.tsx,.txt"
        className="hidden"
      />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6 p-4 xl:p-6 overflow-hidden">
        <div className="lg:col-span-2 h-full flex flex-col gap-4">
           <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/50 text-amber-500 [&>svg]:text-amber-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Medical Disclaimer</AlertTitle>
            <AlertDescription>
              The AI-powered analysis provided here is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified health provider.
            </AlertDescription>
          </Alert>
          <CodeEditor code={code} onCodeChange={setCode} fileName={fileName} />
        </div>
        <div className="h-full flex flex-col">
          <AiPanel code={code} onAppendToEditor={handleAppendToEditor} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
