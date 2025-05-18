'use server';
/**
 * @fileOverview A Genkit flow that extracts student ID information from an ID card image for admin use.
 *
 * - adminExtractBarcodeData - A function that handles the extraction of barcode data.
 * - AdminExtractBarcodeDataInput - The input type for the adminExtractBarcodeData function.
 * - AdminExtractBarcodeDataOutput - The return type for the adminExtractBarcodeData function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AdminExtractBarcodeDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a student ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AdminExtractBarcodeDataInput = z.infer<typeof AdminExtractBarcodeDataInputSchema>;

const AdminExtractBarcodeDataOutputSchema = z.object({
  studentId: z.string().optional().describe('The student ID number, if visible, but usually entered manually from the back side of the card.'),
  studentName: z.string().optional().describe('The full name of the student as printed on the front side of the ID card, if clearly visible.'),
  branch: z.string().optional().describe('The academic branch or department of the student as printed on the front side, if clearly visible.'),
  rollNo: z.string().optional().describe('The roll number of the student, if visible and distinct from the student ID.'),
  yearOfStudy: z.string().optional().describe('The academic year or class of the student (e.g., FY, SY, TY), if visible.'),
});
export type AdminExtractBarcodeDataOutput = z.infer<typeof AdminExtractBarcodeDataOutputSchema>;

export async function adminExtractBarcodeData(input: AdminExtractBarcodeDataInput): Promise<AdminExtractBarcodeDataOutput> {
  return adminExtractBarcodeDataFlow(input);
}

const adminExtractBarcodeDataPrompt = ai.definePrompt({
  name: 'adminExtractBarcodeDataPrompt',
  // Explicitly set the model for this prompt
  model: 'googleai/gemini-2.0-flash',
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo of the FRONT SIDE of a student ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: z.object({
       studentId: z.string().optional().describe('The student ID number, if visible, but usually entered manually from the back side of the card.'),
       studentName: z.string().optional().describe('The full name of the student as printed on the front side of the ID card, if clearly visible.'),
       branch: z.string().optional().describe('The academic branch or department of the student as printed on the front side, if clearly visible.'),
       rollNo: z.string().optional().describe('The roll number of the student, if visible and distinct from the student ID.'),
       yearOfStudy: z.string().optional().describe('The academic year or class of the student (e.g., FY, SY, TY), if visible.'),
    }),
  },
  prompt: `You are an expert data extraction specialist focused on student ID cards.

Analyze the provided image of the FRONT SIDE of a student ID card. Your primary goal is to accurately extract the **student's full name** and **branch/department** as printed on the front side of the card.

- Do NOT attempt to extract the student ID number, roll number, or year of study unless they are clearly visible on the front side. These are usually entered manually from the back side of the card.
- If a field is not visible or you are not confident, omit it or return null/undefined for that optional field. Do not guess or hallucinate information.

Image: {{media url=photoDataUri}}

**Instructions:**
1.  **Prioritize Name and Branch:** Extract the student's full name and branch/department as printed on the FRONT SIDE of the card.
2.  **Other Fields:** Only extract studentId, rollNo, or yearOfStudy if they are clearly visible on the front side. Otherwise, leave them blank for manual entry.
3.  **Output Format:** Return the extracted information strictly in the JSON format defined by the output schema.
`,
});

const adminExtractBarcodeDataFlow = ai.defineFlow<
  typeof AdminExtractBarcodeDataInputSchema,
  typeof AdminExtractBarcodeDataOutputSchema
>(
  {
    name: 'adminExtractBarcodeDataFlow',
    inputSchema: AdminExtractBarcodeDataInputSchema,
    outputSchema: AdminExtractBarcodeDataOutputSchema,
  },
  async input => {
    try {
        // The prompt call will use the model specified in adminExtractBarcodeDataPrompt
        const {output} = await adminExtractBarcodeDataPrompt(input);
        // Ensure studentId is always a string, even if prompt returns null/undefined unexpectedly
        const validatedOutput = {
            ...output,
            studentId: output?.studentId ?? "" // Ensure studentId is always a string
        };
        // Clean up potential nulls returned by the model for optional fields, ensuring they are undefined as per schema
        const finalOutput: AdminExtractBarcodeDataOutput = {
            studentId: validatedOutput.studentId,
            studentName: validatedOutput.studentName || undefined,
            branch: validatedOutput.branch || undefined,
            rollNo: validatedOutput.rollNo || undefined,
            yearOfStudy: validatedOutput.yearOfStudy || undefined,
        };

        console.log("AdminExtract Flow Output:", finalOutput);
        return finalOutput;
    } catch (error) {
        console.error("Error in adminExtractBarcodeDataFlow:", error);
        // Return a default error structure or re-throw
        // Returning a structure allows the frontend to handle it gracefully
        return {
           studentId: "", // Indicate failure by empty ID
           studentName: undefined,
           branch: undefined,
           rollNo: undefined,
           yearOfStudy: undefined,
        };
    }
  }
);
