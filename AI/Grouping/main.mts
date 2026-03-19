import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// point to the .env 
config({ path: path.resolve(__dirname, '../../.env') });

const geminiKey = process.env.geminiAPI;

if (!geminiKey) {
    throw new Error("Missing geminiAPI in .env file! Checked path: " + path.resolve(__dirname, '../../.env'));
}

const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function callAI(newsTitle: string) {
  const prompt = `${newsTitle}`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Example call
callAI("hello gemini how are you").then(console.log);


