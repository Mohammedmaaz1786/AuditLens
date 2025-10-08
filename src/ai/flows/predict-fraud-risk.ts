'use server';

/**
 * @fileOverview An AI agent for predicting fraud risk based on invoice and vendor data.
 *
 * - predictFraudRisk - A function that predicts the risk of fraud.
 * - PredictFraudRiskInput - The input type for the predictFraudRisk function.
 * - PredictFraudRiskOutput - The return type for the predictFraudRisk function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictFraudRiskInputSchema = z.object({
  invoiceData: z.string().describe('The invoice data as a JSON string.'),
  vendorRiskScore: z.number().describe('The risk score of the vendor.'),
});
export type PredictFraudRiskInput = z.infer<typeof PredictFraudRiskInputSchema>;

const PredictFraudRiskOutputSchema = z.object({
  fraudRiskScore: z.number().describe('The predicted fraud risk score (0-1).'),
  explanation: z.string().describe('Explanation of why the invoice is flagged as high/medium/low risk.')
});
export type PredictFraudRiskOutput = z.infer<typeof PredictFraudRiskOutputSchema>;

export async function predictFraudRisk(input: PredictFraudRiskInput): Promise<PredictFraudRiskOutput> {
  return predictFraudRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictFraudRiskPrompt',
  input: {schema: PredictFraudRiskInputSchema},
  output: {schema: PredictFraudRiskOutputSchema},
  prompt: `You are an expert fraud analyst. You are provided with invoice data and vendor risk score. Your task is to predict the likelihood of fraud and explain your reasoning.

Invoice Data: {{{invoiceData}}}
Vendor Risk Score: {{{vendorRiskScore}}}

Based on the invoice data and vendor risk score, determine the fraud risk score between 0 and 1 and the reasoning behind the risk assessment.
`,
});

const predictFraudRiskFlow = ai.defineFlow(
  {
    name: 'predictFraudRiskFlow',
    inputSchema: PredictFraudRiskInputSchema,
    outputSchema: PredictFraudRiskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
