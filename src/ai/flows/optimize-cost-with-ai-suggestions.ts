'use server';
/**
 * @fileOverview An AI agent that analyzes spending patterns and provides AI-driven recommendations for cost optimization.
 *
 * - optimizeCostWithAISuggestions - A function that handles the cost optimization process.
 * - OptimizeCostWithAISuggestionsInput - The input type for the optimizeCostWithAISuggestions function.
 * - OptimizeCostWithAISuggestionsOutput - The return type for the optimizeCostWithAISuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeCostWithAISuggestionsInputSchema = z.object({
  spendingData: z.string().describe('Spending data in JSON format, including categories, amounts, and vendors.'),
  validationRules: z.string().describe('A list of validation rules to improve speed and reliability.'),
});
export type OptimizeCostWithAISuggestionsInput = z.infer<typeof OptimizeCostWithAISuggestionsInputSchema>;

const OptimizeCostWithAISuggestionsOutputSchema = z.object({
  analysisSummary: z.string().describe('A summary of the spending analysis.'),
  costOptimizationRecommendations: z.string().describe('AI-driven recommendations for cost optimization.'),
  potentialSavings: z.string().describe('Estimated potential savings from implementing the recommendations.'),
});
export type OptimizeCostWithAISuggestionsOutput = z.infer<typeof OptimizeCostWithAISuggestionsOutputSchema>;

export async function optimizeCostWithAISuggestions(input: OptimizeCostWithAISuggestionsInput): Promise<OptimizeCostWithAISuggestionsOutput> {
  return optimizeCostWithAISuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeCostWithAISuggestionsPrompt',
  input: {schema: OptimizeCostWithAISuggestionsInputSchema},
  output: {schema: OptimizeCostWithAISuggestionsOutputSchema},
  prompt: `You are an expert financial auditor specializing in cost optimization.

You will analyze the provided spending data and provide actionable recommendations for cost savings.

Consider these validation rules: {{{validationRules}}}

Spending Data: {{{spendingData}}}

Provide a summary of your analysis, specific cost optimization recommendations, and an estimate of potential savings.
`,
});

const optimizeCostWithAISuggestionsFlow = ai.defineFlow(
  {
    name: 'optimizeCostWithAISuggestionsFlow',
    inputSchema: OptimizeCostWithAISuggestionsInputSchema,
    outputSchema: OptimizeCostWithAISuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
