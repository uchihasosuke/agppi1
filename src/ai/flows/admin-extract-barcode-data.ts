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
  studentId: z.string().describe('The student ID number, found in the box above the barcode on the back side of the ID card.'),
  studentName: z.string().optional().describe('The full name of the student as printed on the ID card, if clearly visible.'),
  branch: z.string().optional().describe('The academic branch or department of the student, if clearly visible.'),
  enrollNo: z.string().optional().describe('The Enroll No. of the student, if clearly visible and distinct from the student ID.'),
});
export type AdminExtractBarcodeDataOutput = z.infer<typeof AdminExtractBarcodeDataOutputSchema>;

export async function adminExtractBarcodeData(input: AdminExtractBarcodeDataInput): Promise<AdminExtractBarcodeDataOutput> {
  return adminExtractBarcodeDataFlow(input);
}

const adminExtractBarcodeDataPrompt = ai.definePrompt({
  name: 'adminExtractBarcodeDataPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo of a student ID card (back side), as a data URI that must include a MIME type and use Base64 encoding."
        ),
    }),
  },
  output: {
    schema: z.object({
       studentId: z.string().describe('The Student ID number, found in the box above the barcode.'),
       studentName: z.string().optional().describe('The student\'s full name (if visible from front side data).'),
       branch: z.string().optional().describe('The academic branch/department (if clearly visible on back side).'),
       enrollNo: z.string().optional().describe('The Enroll No. (if clearly visible on back side and distinct from Student ID).'),
    }),
  },
  prompt: `You are an expert data extraction specialist focused on student ID cards.

Analyze the provided image of the **back side** of a student ID card. Your primary goal is to accurately extract the **Student ID number**. This number is always printed **inside the box directly above the barcode**. It might be labeled as "ID No.", "Student ID", "Barcode No.", or just be a sequence of numbers. Do NOT extract numbers below the barcode or elsewhere on the card. Ignore any numbers that look like phone numbers.

Secondary goals are to extract the following information **only if clearly visible and legible on the back side**:
1. branch: The student's academic branch/department. This is crucial as it determines if enrollment number is required.
2. enrollNo: The student's Enroll No. (distinct from the Student ID). This is typically located **ABOVE the Student ID number** in a separate field. Look for fields labeled "Enroll No.", "Enrollment No.", or similar.

Note: Student Name is typically on the front side. If any front side data is incidentally visible and clear (unlikely from a back side scan), you may extract the studentName, but prioritize back side data.

Image: {{media url=photoDataUri}}

**Instructions:**
1. **Prioritize Student ID:** Find the numeric or alphanumeric code printed inside the box above the barcode on the back side. Do NOT extract numbers from below the barcode.
2. **Extract Branch First:** Look for the branch/department information. This is important as it determines if enrollment number is required.
3. **Extract Enroll No. for Non-Staff:** If the branch is NOT "Staff", look for the enrollment number in the field ABOVE the Student ID number. This is a separate field that should be clearly labeled.
4. **Handle Student Name:** Extract studentName only if clearly visible, likely from a partial view of the front.
5. **Accuracy over Completeness:** For 'studentName', 'branch', and 'enrollNo', only extract the information if you are confident in its accuracy. If unsure or the field is not present, omit it or return null/undefined.
6. **Output Format:** Return the extracted information strictly in the JSON format defined by the output schema.
7. **Student ID Guarantee:** Always return a value for 'studentId'. If you absolutely cannot find any number in the box above the barcode, return an empty string "". Do not return null or omit the 'studentId' field.
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
            enrollNo: validatedOutput.enrollNo || undefined,
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
           enrollNo: undefined,
        };
    }
  }
);
