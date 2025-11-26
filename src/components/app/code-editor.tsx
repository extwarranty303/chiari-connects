'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type CodeEditorProps = {
  code: string;
  onCodeChange: (code: string) => void;
  fileName: string;
};

/**
 * @fileoverview CodeEditor component provides a simple textarea-based editor for code.
 * It displays the current file name in the header and allows the user to modify the code.
 *
 * @param {CodeEditorProps} props - The props for the CodeEditor component.
 * @param {string} props.code - The code content to display in the editor.
 * @param {(code: string) => void} props.onCodeChange - Callback function to handle code changes.
 * @param {string} props.fileName - The name of the file being edited.
 * @returns {React.ReactElement} A card-based code editor component.
 */
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
