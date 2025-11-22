import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SegmentData } from '../types';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeAudioSegments = async (base64Audio: string, mimeType: string): Promise<SegmentData[]> => {
  const modelId = 'gemini-2.5-flash';

  const responseSchema: Schema = {
    type: Type.ARRAY,
    description: "List of sentences extracted from the audio with strict timestamps.",
    items: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The exact English text of the sentence.",
        },
        start: {
          type: Type.NUMBER,
          description: "The start time of the sentence in seconds (e.g., 12.5).",
        },
        end: {
          type: Type.NUMBER,
          description: "The end time of the sentence in seconds (e.g., 15.2).",
        },
      },
      required: ["text", "start", "end"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: `Please listen to this audio carefully. 
            1. Transcribe the speech into English text.
            2. Split the transcription strictly by sentences.
            3. For each sentence, provide the exact start time and end time in seconds.
            4. Ensure the timestamps are precise to align with the audio.
            
            Return the result as a JSON array.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for factual/precise extraction
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No response text from Gemini.");
    }

    const segments = JSON.parse(jsonText) as SegmentData[];
    return segments;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
