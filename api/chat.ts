// api/chat.ts
//import { chatBot } from "../AI/userSummaries/userSummary.mts";
//import { config } from 'dotenv';
//import path from 'path';
//import { fileURLToPath } from 'url';
////import fs, { write } from 'fs';
//import { exec } from 'child_process';
import { GoogleGenerativeAI } from "@google/generative-ai";
//import { time } from "console";
import { Groq } from "groq-sdk";
/*
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { item, message } = req.body;

    
    const { chatBot } = await import("../AI/userSummaries/userSummary.mts");

    const aiResponse = await chatBot(item, message);
    res.status(200).send(aiResponse);
  } catch (error: any) {
    console.error(error);
    res.status(500).send("Error: " + error.message);
  }
}
*/


type SummaryItem = {
  id: number | string;
  category?: string | null;
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string | null;
  likeIm5?: string | null;
  "5ws"?: string | null;
  source_names?: string[] | null;
  authors?: string[] | null;
  urls?: string[] | null;
  created_at?: string | null;
};



const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.geminiAPI || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 3. MAIN HANDLER
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { item, message } = req.body;
    
    if (!process.env.GROQ_API_KEY || !process.env.geminiAPI) {
        throw new Error("Missing API keys in Vercel Environment Variables");
    }

    const aiResponse = await chatBot(item, message);
    res.status(200).send(aiResponse);
  } catch (error: any) {
    console.error("Handler Error:", error.message);
    res.status(500).send("Error: " + error.message);
  }
}



export async function callAI(prompt: string):Promise<string> {
    try {
       //console.log("Attempting to connect to Groq...");
        
        
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile", 
           // model: "llama-3.1-8b-instant", 

        });

        const aiText = response.choices[0]?.message?.content || "";
        //console.log("groq reponse complete");
        return aiText;
    } catch (error: any) {
        console.error("Groq Connection failed!", error.message);
        if (error.message.includes("rate_limit_exceeded")) {
            
            const match = error.message.match(/try again in ([\d.]+)(ms|s)/);
            
            if (match) {
                const delay = match[2] === "s" ? parseFloat(match[1]) * 1000 : parseFloat(match[1]);
                
                console.log(`Rate limited. Sleeping for ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay + 50)); 
                
                return await callAI(prompt);
            }
        }
        console.log('ATTEMPTING TO SWITCH TO GEMINI')
        return await callGeminiAI(prompt)       //try to switch to gemini
    }
}





export async function callGeminiAI(prompt:string):Promise<string>{
    try {
            console.log("Attempting to connect to Gemini...");
            const result = await model.generateContent(prompt);
            
            const response = await result.response;
            
            const aiText = response.text();
            console.log("gemini reponse complete")
            return aiText;
        } catch (error: any) {
            console.error("Gemini Connection failed!", error.message);
            
            return "ERROR ON GEMINI CALL";
        }
}




export async function chatBot(newsArray:SummaryItem|null,userPrompt?:String):Promise<string>{
   // var callAI = await importCallAI()
    if(userPrompt == null){
        return "there was an error sending your prompt"
    }
    if ((newsArray==null)){
        return "there was an error fetching the content of this article"
    }
 const sysPrompt = `
        ### ROLE
        You are a "Context-Aware News Analyst." Provide short, high-impact answers by blending the provided news with verified facts.

        ### PRIMARY KNOWLEDGE BASE (Provided News)
        ${JSON.stringify(newsArray)}

        ### OPERATIONAL GUIDELINES
        1. **Brevity is King:** Keep your responses under 3 paragraphs. Use short, punchy sentences. Avoid fluff.
        2. **Grounded Augmentation:** Use the provided JSON as your primary source, but fill in missing background context (names, definitions, history) using your internal knowledge.
        3. **The "Fact-Checking" Filter:** Supplement vague details with verified facts, but do not invent quotes or statistics.
        4. **Deflection:** If a query is unrelated to the news, give a 1-sentence deflection and nudge them back to the stories.
        5. **Neutrality:** Maintain a clinical, objective tone.

        ### OUTPUT FORMAT
        - Use clear headings or bold text for key terms if it helps clarity.
        - No introductory filler like "Sure, I can help with that." Get straight to the answer.

        ### USER QUERY
        "${userPrompt}"
        `;
            
    var response = await callAI(sysPrompt)
    
    return response
}