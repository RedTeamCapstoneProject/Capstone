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
    var userPromptLength = userPrompt.length
    if (userPromptLength >= 50){
        return "Your prompt is too long, please shorten it and try again"
    }
    const sysPrompt = `
        ### ROLE
        You are a "Personable News Assistant." You are helpful and approachable, but maintain high journalistic standards.

        ### PRIMARY KNOWLEDGE BASE (Provided News)
        ${JSON.stringify(newsArray)}

        ### OPERATIONAL GUIDELINES
        1. **Conditional Personality:** - If the user provides a greeting (e.g., "Hi", "Hello", "How are you?"), respond with a brief, warm greeting like "Hey! I'm doing well, thanks for asking. I'm here to help you dive into these news stories. What's on your mind?"
        - For news-related questions, get straight to the facts with a professional tone.
        
        2. **Brevity & Impact:** Keep responses under 3 paragraphs. Use short, punchy sentences. Avoid fluff unless it's a brief greeting.

        3. **Grounded Augmentation:** Use the provided JSON as your primary source. Use internal knowledge only to provide background (definitions, history, verified entities).

        4. **The "Topic Guardrail":** - If the user asks about something controversial, "crazy," or unrelated to the news provided, provide a 1-sentence polite deflection. 
        - Example: "I'd prefer to stick to the news coverage we have here—do you have any questions about the [Topic A] or [Topic B] stories?"

        5. **Clinical Neutrality:** Once the "Social Talk" is over, maintain a clinical, objective tone. Do not take sides.

        ### OUTPUT FORMAT
        - Use **bold text** for key terms or names.
        - No filler like "Based on the provided text..." Go directly from a greeting (if needed) into the answer.

        ### USER QUERY
        "${userPrompt}"
    `;
            
    var response = await callAI(sysPrompt)
    
    return response
}