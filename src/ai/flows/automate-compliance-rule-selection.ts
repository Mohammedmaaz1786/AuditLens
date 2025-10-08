// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Automatically determines which compliance validation rules to run on uploaded invoices based on document type and vendor.
 *
 * - automateComplianceRuleSelection - A function that handles the compliance rule selection process.
 * - AutomateComplianceRuleSelectionInput - The input type for the automateComplianceRuleSelection function.
 * - AutomateComplianceRuleSelectionOutput - The return type for the automateComplianceRuleSelection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomateComplianceRuleSelectionInputSchema = z.object({
  documentType: z
    .string()
    .describe('The type of document uploaded (e.g., invoice, contract).'),
  vendorName: z.string().describe('The name of the vendor associated with the document.'),
  invoiceData: z.string().describe('The extracted invoice data from the uploaded document.'),
});
export type AutomateComplianceRuleSelectionInput = z.infer<
  typeof AutomateComplianceRuleSelectionInputSchema
>;

const AutomateComplianceRuleSelectionOutputSchema = z.object({
  applicableRules: z
    .array(z.string())
    .describe('An array of compliance validation rules to apply to the document.'),
});
export type AutomateComplianceRuleSelectionOutput = z.infer<
  typeof AutomateComplianceRuleSelectionOutputSchema
>;

export async function automateComplianceRuleSelection(
  input: AutomateComplianceRuleSelectionInput
): Promise<AutomateComplianceRuleSelectionOutput> {
  return automateComplianceRuleSelectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automateComplianceRuleSelectionPrompt',
  input: {schema: AutomateComplianceRuleSelectionInputSchema},
  output: {schema: AutomateComplianceRuleSelectionOutputSchema},
  prompt: `You are an expert compliance officer. Given the document type, vendor name, and invoice data, determine the most relevant compliance validation rules that should be applied.

Document Type: {{{documentType}}}
Vendor Name: {{{vendorName}}}
Invoice Data: {{{invoiceData}}}

Return a JSON array of applicable compliance rules.  Consider rules related to data accuracy, regulatory compliance, fraud detection, and vendor risk.

Example of compliance rules:
["Check for duplicate invoice numbers", "Verify vendor address against registered address", "Validate amount against purchase order", "Ensure all required fields are present"]

Do not return any text besides the JSON array.`,
});

const automateComplianceRuleSelectionFlow = ai.defineFlow(
  {
    name: 'automateComplianceRuleSelectionFlow',
    inputSchema: AutomateComplianceRuleSelectionInputSchema,
    outputSchema: AutomateComplianceRuleSelectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
