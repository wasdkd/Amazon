import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  const localKey = localStorage.getItem('GEMINI_API_KEY_USER');
  if (localKey) return localKey;
  
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey || envKey === "MY_GEMINI_API_KEY" || envKey === "") return null;
  
  return envKey;
};

export const isApiKeyMissing = () => !getApiKey();

export async function analyzeImage(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MISSING_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Analyze this image. 
  If it contains a table, extract all data from the table precisely. 
  If it's primarily a document or text, extract it as clean Markdown text.
  
  Return the result in JSON format.
  For tables: { "type": "table", "tableData": { "headers": ["col1", "col2", ...], "rows": [["row1-val1", "row1-val2", ...], ...] } }
  For text: { "type": "text", "textContent": "extracted markdown text..." }`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash", 
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["table", "text"] },
          tableData: {
            type: Type.OBJECT,
            properties: {
              headers: { type: Type.ARRAY, items: { type: Type.STRING } },
              rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
              title: { type: Type.STRING }
            }
          },
          textContent: { type: Type.STRING }
        },
        required: ["type"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return result as AnalysisResult;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  title?: string;
}

export interface AnalysisResult {
  type: 'table' | 'text';
  tableData?: TableData;
  textContent?: string;
}
