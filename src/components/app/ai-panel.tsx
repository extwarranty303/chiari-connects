'use client';

import React, { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, Cuboid, Wand2, Copy, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { suggestCodeRefactoring } from '@/ai/flows/ai-suggest-code-refactoring';
import { analyzeAndAssistCodebase } from '@/ai/flows/ai-analyze-and-assist-codebase';
import { generateReactComponent } from '@/ai/flows/ai-generate-react-component';

type AiPanelProps = {
  code: string;
  onAppendToEditor: (code: string, type: 'component' | 'suggestion') => void;
};

const AIPanelTabContent = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <Card className="h-full flex flex-col border-0 shadow-none">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
            {children}
        </CardContent>
    </Card>
);

const LoadingSkeleton = () => (
    <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
    </div>
)

const ResultDisplay = ({ result, onAppend, appendType }: { result: string; onAppend: (code: string, type: 'component' | 'suggestion') => void; appendType: 'component' | 'suggestion' }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        toast({ title: 'Copied to clipboard!' });
    };

    return (
        <div className="space-y-2 animate-in fade-in-0 duration-500">
            <pre className="text-sm font-code bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{result}</pre>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="mr-2 h-4 w-4" />Copy</Button>
                <Button variant="outline" size="sm" onClick={() => onAppend(result, appendType)}><PlusCircle className="mr-2 h-4 w-4" />Append to Editor</Button>
            </div>
        </div>
    )
};


const RefactorTab = ({ code, onAppendToEditor }: AiPanelProps) => {
    const [isPending, startTransition] = useTransition();
    const [suggestions, setSuggestions] = useState('');

    const handleRefactor = () => {
        startTransition(async () => {
            setSuggestions('');
            const result = await suggestCodeRefactoring({ reactCode: code });
            setSuggestions(result.refactoringSuggestions);
        });
    };

    return (
        <AIPanelTabContent title="Refactor Code" description="Get AI-powered suggestions to improve your code.">
            <Button onClick={handleRefactor} disabled={isPending}>
                <Wand2 className="mr-2 h-4 w-4" />
                {isPending ? 'Analyzing...' : 'Suggest Refactoring'}
            </Button>
            <ScrollArea className="flex-1 rounded-md border p-4 bg-background">
                {isPending && <LoadingSkeleton />}
                {suggestions && <ResultDisplay result={suggestions} onAppend={onAppendToEditor} appendType="suggestion" />}
                {!isPending && !suggestions && <p className="text-sm text-muted-foreground">Click the button to get refactoring suggestions.</p>}
            </ScrollArea>
        </AIPanelTabContent>
    );
};

const AssistTab = ({ code, onAppendToEditor }: AiPanelProps) => {
    const [isPending, startTransition] = useTransition();
    const [requirements, setRequirements] = useState('');
    const [assistance, setAssistance] = useState('');

    const handleAssistance = () => {
        if (!requirements) return;
        startTransition(async () => {
            setAssistance('');
            const result = await analyzeAndAssistCodebase({ codebase: code, projectRequirements: requirements });
            setAssistance(`Analysis:\n${result.analysis}\n\nSuggestions:\n${result.suggestions}\n\nContextual Assistance:\n${result.contextualAssistance}`);
        });
    };

    return (
        <AIPanelTabContent title="Codebase Assistant" description="Get contextual help based on your project requirements.">
             <Textarea
                placeholder="Describe your project requirements or what you want to achieve..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="h-32"
            />
            <Button onClick={handleAssistance} disabled={isPending || !requirements}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                {isPending ? 'Analyzing...' : 'Get Assistance'}
            </Button>
            <ScrollArea className="flex-1 rounded-md border p-4 bg-background">
                {isPending && <LoadingSkeleton />}
                {assistance && <ResultDisplay result={assistance} onAppend={onAppendToEditor} appendType="suggestion" />}
                {!isPending && !assistance && <p className="text-sm text-muted-foreground">Describe your needs and get AI assistance.</p>}
            </ScrollArea>
        </AIPanelTabContent>
    );
};

const GenerateTab = ({ onAppendToEditor }: { onAppendToEditor: (code: string, type: 'component') => void }) => {
    const [isPending, startTransition] = useTransition();
    const [description, setDescription] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    
    const handleGenerate = () => {
        if (!description) return;
        startTransition(async () => {
            setGeneratedCode('');
            const result = await generateReactComponent({ componentDescription: description });
            setGeneratedCode(result.componentCode);
        });
    };

    return (
        <AIPanelTabContent title="Generate Component" description="Create new React components from a description.">
            <Textarea
                placeholder="e.g., 'A button component with a primary and secondary variant that shows a loading spinner.'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-32"
            />
            <Button onClick={handleGenerate} disabled={isPending || !description}>
                <Cuboid className="mr-2 h-4 w-4" />
                {isPending ? 'Generating...' : 'Generate Component'}
            </Button>
            <ScrollArea className="flex-1 rounded-md border p-4 bg-background">
                {isPending && <LoadingSkeleton />}
                {generatedCode && <ResultDisplay result={generatedCode} onAppend={onAppendToEditor} appendType="component" />}
                {!isPending && !generatedCode && <p className="text-sm text-muted-foreground">Describe a component to generate it with AI.</p>}
            </ScrollArea>
        </AIPanelTabContent>
    );
};

/**
 * @fileoverview AiPanel component displays a tabbed interface for AI-powered code assistance.
 * It includes three main features:
 * 1. Refactor Code: Suggests improvements for the provided code.
 * 2. Codebase Assistant: Provides contextual help based on user requirements.
 * 3. Generate Component: Creates new React components from a textual description.
 *
 * @param {AiPanelProps} props - The props for the AiPanel component.
 * @param {string} props.code - The current code from the editor.
 * @param {(code: string, type: 'component' | 'suggestion') => void} props.onAppendToEditor - Callback to append generated code to the editor.
 * @returns {React.ReactElement} A card component with tabbed AI features.
 */
export function AiPanel({ code, onAppendToEditor }: AiPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <Tabs defaultValue="refactor" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-auto mt-2 max-w-sm">
          <TabsTrigger value="refactor"><Wand2 className="mr-1 h-4 w-4" />Refactor</TabsTrigger>
          <TabsTrigger value="assist"><BrainCircuit className="mr-1 h-4 w-4" />Assist</TabsTrigger>
          <TabsTrigger value="generate"><Cuboid className="mr-1 h-4 w-4" />Generate</TabsTrigger>
        </TabsList>
        <TabsContent value="refactor" className="flex-grow overflow-hidden">
          <RefactorTab code={code} onAppendToEditor={onAppendToEditor} />
        </TabsContent>
        <TabsContent value="assist" className="flex-grow overflow-hidden">
          <AssistTab code={code} onAppendToEditor={onAppendToEditor} />
        </TabsContent>
        <TabsContent value="generate" className="flex-grow overflow-hidden">
          <GenerateTab onAppendToEditor={(newCode) => onAppendToEditor(newCode, 'component')} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
