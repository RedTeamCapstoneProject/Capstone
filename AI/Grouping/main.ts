import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiKey = process.env.geminiAPI;

if (!geminiKey) {
  throw new Error("Missing geminiAPI in .env file!");
}

const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function callAI(newsTitle: string) {
  const prompt = `${newsTitle}`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Example usage:
callAI("hello gemini how are you").then(console.log);


