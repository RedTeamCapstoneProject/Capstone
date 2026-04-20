
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import { Pool } from 'pg'; 
import { createHash } from 'crypto';


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


const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1 
});





const hashIP = (ip: string): string => {
  return createHash('sha256')
    .update(ip + process.env.HASH_SALT) 
    .digest('hex');
};



const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.geminiAPI || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
/*
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        
    const { item, message, UserId } = req.body; // Grab userId from body
        
        const rawIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
        const userIP = hashIP(rawIP || "unknown");        //hash ips for security

        
        const client = await pool.connect();
    try {
        if(UserId){ //if user is logged in 

            //get the current amount of calls for the user from the db
            const userCheck = await client.query( 
                'SELECT chatbot_calls FROM users WHERE id = $1',
                [UserId]
            );
            const currentCalls = userCheck.rows.length > 0 ? userCheck.rows[0].chatbot_calls : 0;
            
            //if they are out of calls
            if (currentCalls <= 0) {
                return res.status(429).json({ 
                    error: "Limit reached", 
                    message: "I'm sorry, you have reached your chatbot call limit..." 
                });
            }

            /*
            // Update the amount of calls by subtracting 1 
            await client.query(
                'UPDATE users SET chatbot_calls = chatbot_calls - 1 WHERE id = $1',
                [UserId]
            );
            

        }else{ //if user isnt logged in

            //check how many calls they have at that IP
            const checkResult = await client.query(
                'SELECT calls FROM ai_calls WHERE ip = $1',
                [userIP]
            );
            const currentCalls = checkResult.rows.length > 0 ? checkResult.rows[0].calls : 5;

            //if out of calls
            if (currentCalls <= 0) {
                return res.status(429).json({ 
                    error: "Limit reached", 
                    message: "You have 0 messages remaining. Please log in to continue!" 
                });
                
            }

            /*
            //update by subtracting one
            await client.query(
                `INSERT INTO ai_calls (ip, calls) 
                VALUES ($1, 4) 
                ON CONFLICT (ip) 
                DO UPDATE SET calls = ai_calls.calls - 1`,
                [userIP]
            );
            
        }

    } catch (dbError: any) {
        console.error("Database error:", dbError.message);
    } finally {
        client.release();
    }

    try {
        const { item, message } = req.body;
        
        if (!process.env.GROQ_API_KEY || !process.env.geminiAPI) {
            throw new Error("Missing API keys in Vercel Environment Variables");
        }

        const aiResponse = await chatBot(item, message);
        res.status(200).send(aiResponse);
        if(UserId){
            await client.query(
                'UPDATE users SET chatbot_calls = chatbot_calls - 1 WHERE id = $1',
                [UserId]
            );
        }else{
            await client.query(
                `INSERT INTO ai_calls (ip, calls) 
                VALUES ($1, 4) 
                ON CONFLICT (ip) 
                DO UPDATE SET calls = ai_calls.calls - 1`,
                [userIP]
            );
        }
    } catch (error: any) {
        console.error("Handler Error:", error.message);
        res.status(500).send("Error: " + error.message);
    }
}
*/
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        
    const { item, message, UserId } = req.body; //get the stuff
    const rawIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress; //use node to get the rawIP
    const userIP = hashIP(rawIP || "unknown"); //hash ip

    const client = await pool.connect();    
    try {
        let currentCalls = 0;
        console.log("this is user id: "+ UserId)
        if (UserId && UserId !== "null") { //if user is logged in
            //get there call number from db
            const userCheck = await client.query( 
                'SELECT chatbot_calls FROM users WHERE id = $1',
                [UserId]
            );
            currentCalls = userCheck.rows.length > 0 ? userCheck.rows[0].chatbot_calls : 0;
            
            //if nocalls left
            if (currentCalls <= 0) {
                client.release(); 
                return res.status(429).json({ 
                    error: "Limit reached", 
                    message: "I'm sorry, you have reached your chatbot call limit..." 
                });
            }
        } else { //user is not logged in

            //get count from db based on IP
            const checkResult = await client.query(
                'SELECT calls FROM ai_calls WHERE ip = $1',
                [userIP]
            );
            currentCalls = checkResult.rows.length > 0 ? checkResult.rows[0].calls : 5;

            //if no calls left
            if (currentCalls <= 0) {
                client.release(); 
                return res.status(429).json({ 
                    error: "Limit reached", 
                    message: "You have 0 messages remaining. Please log in to continue!" 
                });
            }
        }

        // call ai
        if (!process.env.GROQ_API_KEY || !process.env.geminiAPI) {
            throw new Error("Missing API keys");
        }

        const aiResponse = await chatBot(item, message);

        // update DB 
        if (UserId && UserId !== "null") { //subtract 1 if user is logged in 
            await client.query(
                'UPDATE users SET chatbot_calls = chatbot_calls - 1 WHERE id = $1',
                [UserId]
            );
        } else { //subtract 1 if user is logged out
            await client.query(
                `INSERT INTO ai_calls (ip, calls) 
                VALUES ($1, 4) 
                ON CONFLICT (ip) 
                DO UPDATE SET calls = ai_calls.calls - 1`,
                [userIP]
            );
        }

        //send it over to single.ts
        res.status(200).send(aiResponse);

    } catch (dbError: any) {
        console.error("Handler Error:", dbError.message);
        res.status(500).send("Error: " + dbError.message);
    } finally {
        
        client.release();
    }
}








export async function callAI(prompt: string):Promise<string> {
    try {
        
        
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