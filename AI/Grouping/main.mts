//import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { type newsArticle, callAI, readJSON, writeToJSON } from "../AIExportedFunctions/exportedFunctions.mts";
import { exec } from 'child_process';
import { fileURLToPath } from 'url';



export const runDataImport = () => {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const scriptPath = path.resolve(currentDir, '../../scripts/importArticlesFromJson.ps1');

  console.log('Starting database import...');

  // 'powershell -ExecutionPolicy Bypass -File' ensures the script isn't blocked by Windows security
  exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution Error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`PowerShell Error: ${stderr}`);
      return;
    }

    // This will show the "Inserted rows: X" message from your script
    console.log(`Success: ${stdout}`);
  });
};



async function categorizeNews(originalArticleArray: newsArticle[]){

    //create an array of promise. only retrun when all promises are done
    const categorizationTasks = originalArticleArray.map(async (article)=>{
        const systemPrompt = `analyze the content of this news article ${article.content}
            reply with the only the one word category that the article fits in. An article can only be in one category.
            Here are the set categories that you can choose from: Technology, Politics, Sports, World News, Economics, Entertainment, Culture`;
        
            const category = callAI(systemPrompt);
        article.category = (await category)?.trim().toLowerCase().replace(/[^a-z]/g, '');  
    });
    await Promise.all(categorizationTasks);

    return originalArticleArray;
}



async function determineTopics(categoryArticleArray: newsArticle[]){
    
   // console.log(`\n working on: ${articles}`); 
    const articlesString = JSON.stringify(categoryArticleArray);
    const systemPrompt = `You are an expert News Editor at an AI-first news platform. 
        Your goal is to perform "Story Clustering" on this batch of news articles ${articlesString}.

        TASKS:
        1. Analyze the provided JSON of news articles.
        2. Identify distinct "Stories" or "Thematic Clusters" where multiple articles overlap.
        3. Create a granular, punchy "Story Title" for each cluster (e.g., "The DHS Shutdown Standoff" rather than just "Politics").
        4. Ensure titles are descriptive enough to summarize later.
        5. If an article doesn't fit a cluster, group it into a "Daily Brief" or "General" category.

        OUTPUT FORMAT:
        Return ONLY a comma-separated list of these Story Titles. 
        No numbers, no explanations, no formatting—just the names.

        EXAMPLES of Particle-style titles:
        - OpenAI's "Psychosis" & The Future of AI Coding
        - Autonomous Construction: The $1.75B Robotics Boom
        - Enphase & Vermont’s Virtual Power Plant Expansion
        - Cam Ward's Path to the Hall of Fame`;

    var topics = await callAI(systemPrompt);
    console.log(topics)
    

    //create an array of promises. execute all promises till all are done then return them all at once
    const assigningTopics = categoryArticleArray.map(async (article)=>{
        const systemPrompt2 = ` ### INSTRUCTION
            You are a classification engine. Your task is to match the provided News Article to EXACTLY ONE topic from the provided list.
            ### TOPIC LIST
            [ ${topics} ]
            ### ARTICLE CONTENT
            ${article.content}
            ### CONSTRAINT
            - You must choose a topic ONLY from the list above.
            - If no topic fits perfectly, choose "General" or the closest match.
            - Respond with ONLY the name of the topic. 
            - Do NOT include a period, quotes, or any introductory text like "The topic is...".`
        const assignedTopic = await callAI(systemPrompt2) 
        article.topic = assignedTopic?.trim().replace(/['"]+/g, '');
    });
    await Promise.all(assigningTopics);
    return categoryArticleArray
}



export async function run() {
    try {
        var originalArticleArray = await readJSON("AI/Grouping/testData.json")
        var categoryArticleArray = await categorizeNews(originalArticleArray)
        var completedArray = await determineTopics(categoryArticleArray)
        await writeToJSON(completedArray)
        console.log("articles written succesfully")
    } catch(error){
        console.error("Error processing the data: ", error);
    }finally {
        console.log("Shutting down...");
        runDataImport()
    }
}

run();