import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

const geminiKey = process.env.geminiAPI;



if (!geminiKey) {
    throw new Error(`Missing geminiAPI in .env file. path: ${envPath}`);
}

const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });


//call the gemini api with a prompt as input.
// retun the response from api
async function callAI(prompt: string) {
    try {
        console.log("Attempting to connect to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("AI Response:", response.text());
        return response.text();
    } catch (error: any) {
        console.error("Connection failed!");
        console.error("Error Code:", error.code); 
        console.error("Message:", error.message);
    }
}


// categorize news articles by loading them into an array from a json
//then for each article in the array get AI to analyze and output a category
//asign the category to the article and rewrite to a json file with category.
async function categorizeNews(){
  const data = JSON.parse(fs.readFileSync('testData.json', 'utf-8'));
  const articleArray = data.articles;

  for (const article of articleArray){
    console.log(`\n working on: ${article.title}`); 
    const systemPrompt = `analyze the content of this news article ${article.content}
    reply with one word, that being thecategory that the article belongs to, that being either: politics, sports, entertainment, technology, or other
    `;
    var category = callAI(systemPrompt);
    article.category = (await category)?.trim().toLowerCase().replace(/[^a-z]/g, '');  }

  fs.writeFileSync('outputTestData.json', JSON.stringify(articleArray, null, 2), 'utf-8');

}


async function run() {
    try {
        //await callAI("whats up gemini");
        await categorizeNews();

    } finally {
        console.log("Shutting down...");
        setTimeout(() => process.exit(0), 100); //slight delay incase things need to finish
    }
}

run();