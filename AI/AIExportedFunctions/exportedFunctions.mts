import Groq from "groq-sdk";
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs, { write } from 'fs';

//this is how the news articles are formated with category and topic as an object
//often used in an array like this: newsArticle[]
export interface newsArticle{
   source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string;
    category?: string; 
    topic?: string;    
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

const GROQ_API_KEY = process.env.GROQ_API_KEY;



if (!GROQ_API_KEY) {
    throw new Error(`Missing geminiAPI in .env file. path: ${envPath}`);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//input a prompt as parameter and return results from AI 
export async function callAI(prompt: string) {
    try {
        console.log("Attempting to connect to Groq...");
        
        
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
        //console.log("AI Response:", aiText);
        return aiText;
    } catch (error: any) {
        console.error("Groq Connection failed!", error.message);
        return "ERROR_FETCHING_TOPIC"; 
    }
}



//read a JSON of articles and return an array of newsArticle objects
export async function readJSON(path:string): Promise<newsArticle[]>{
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    const originalArticleArray: newsArticle[] = data.articles;
    return originalArticleArray
}

//write an array of articles with category and topic to a output.json
export async function writeToJSON(completedArray: newsArticle[]){
    const withTopic = completedArray.filter(a => a.topic).length;
    console.log(`Total Articles: ${completedArray.length}`);
    console.log(`Articles with Topics: ${withTopic}`);
    fs.writeFileSync('AI/Grouping/outputTestData.json', JSON.stringify(completedArray, null, 2), 'utf-8');
}



//just a temp read function for testing 
export async function tempreadJSON(path: string): Promise<newsArticle[]> {
    try {
        const rawData = fs.readFileSync(path, 'utf-8');
        
        const data = JSON.parse(rawData);

       
        const articleArray = Array.isArray(data) ? data : data.articles;

        if (!articleArray) {
            console.warn(`No articles found in ${path}. Returning empty array.`);
            return [];
        }

        return articleArray;
    } catch (error: any) {
        console.error(`Error reading JSON at ${path}:`, error.message);
        return []; 
    }
}