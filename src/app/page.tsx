'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app/header';
import { CodeEditor } from '@/components/app/code-editor';
import { AiPanel } from '@/components/app/ai-panel';
import { useToast } from "@/hooks/use-toast"
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

const defaultCode = `import React from 'react';

const MyComponent = () => {
  const [count, setCount] = React.useState(0);

  // A simple component to demonstrate the editor
  return (
    <div style={{padding: '20px', border: '1px solid #ccc', borderRadius: '8px'}}>
      <h2>Welcome to React Refinery!</h2>
      <p>You can upload your React code or edit this example.</p>
      <p>Current count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default MyComponent;
`;

export default function ReactRefineryPage() {
  const [code, setCode] = useState<string>(defaultCode);
  const [fileName, setFileName] = useState<string>('component.jsx');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.jsx') || file.name.endsWith('.js') || file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
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
          description: "Please upload a valid React file (.js, .jsx, .ts, .tsx).",
        })
      }
    }
    // Reset file input to allow uploading the same file again
    if(event.target) {
        event.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleCodeDownload = () => {
    const blob = new Blob([code], { type: 'text/javascript;charset=utf-t' });
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

  const handleAppendToEditor = useCallback((newCode: string, type: 'component' | 'suggestion') => {
    setCode(currentCode => `${currentCode}\n\n/* --- ${type === 'component' ? 'Generated Component' : 'AI Suggestion'} --- */\n${newCode}`);
    toast({
        title: type === 'component' ? 'Component Added' : 'Code Added',
        description: `The new code has been appended to the editor.`,
    })
  }, []);

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
        accept=".js,.jsx,.ts,.tsx"
        className="hidden"
      />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6 p-4 xl:p-6 overflow-hidden">
        <div className="lg:col-span-2 h-full flex flex-col">
          <CodeEditor code={code} onCodeChange={setCode} fileName={fileName} />
        </div>
        <div className="h-full flex flex-col">
          <AiPanel code={code} onAppendToEditor={handleAppendToEditor} />
        </div>
      </main>
    </div>
  );
}
