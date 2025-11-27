'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-analyze-and-assist-codebase.ts';
import '@/ai/flows/ai-generate-react-component.ts';
import '@/ai/flows/ai-suggest-code-refactoring.ts';
import '@/ai/flows/ai-analyze-symptoms.ts';
import '@/ai/flows/ai-analyze-symptoms-with-imaging.ts';
import '@/ai/flows/ai-analyze-symptoms-with-report.ts';
import '@/ai/flows/ai-generate-doctor-questions.ts';
import '@/ai/flows/ai-consolidate-analyses.ts';
