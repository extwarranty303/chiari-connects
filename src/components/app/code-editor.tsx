'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type CodeEditorProps = {
  code: string;
  onCodeChange: (code: string) => void;
  fileName: string;
};

export function CodeEditor({ code, onCodeChange, fileName }: CodeEditorProps) {
  return (
    <Card className="h-full flex-grow flex flex-col shadow-lg">
      <CardHeader className="p-4 border-b">
        <p className="text-sm font-medium font-mono">{fileName}</p>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Upload or write your React code here..."
          className="w-full h-full min-h-[200px] resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 font-code text-base p-4 bg-card"
          spellCheck="false"
        />
      </CardContent>
    </Card>
  );
}
