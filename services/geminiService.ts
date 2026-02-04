import { GoogleGenAI } from "@google/genai";
import { SalesScriptConfig } from '../types';

// Helper to check if API key is set
export const hasApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

export const generateSalesScript = async (phoneNumber: string, config: SalesScriptConfig): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a world-class sales coach.
    Write a concise, polite, and professional cold-calling opening script for a telecom agent.
    
    Context:
    - The phone number ${phoneNumber} has just been checked and is NOT on the Do Not Call Registry.
    - Product to pitch: "${config.productName}".
    - Target Audience: "${config.customerSegment}".
    - Desired Tone: "${config.tone}".
    
    Guidelines:
    - Start with a polite greeting.
    - Acknowledge that you are calling from a verified list.
    - Get straight to the value proposition.
    - Keep it under 100 words.
    - Do not use placeholders like [Name], assume we don't know the name yet.
  `;

  try {
    const response = await ai.models.generateContent({
      // FIX: Use recommended model for basic text tasks.
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Could not generate script at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating script. Please try again later.";
  }
};
