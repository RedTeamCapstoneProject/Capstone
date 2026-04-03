//import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { type newsArticle, callAI, readJSON, writeToJSON } from "../AIExportedFunctions/exportedFunctions.mts";
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import chokidar from 'chokidar';
import cron from 'node-cron';
import Fs from 'node:fs/promises';


/*
//wait for 12:10 to read 0_100
cron.schedule('10 0 * * *', async () => {
    console.log('It is 12:10! Starting the fetch and summary...');
    try {
        await run("12:10");
        console.log(' 12:10 task complete.');
    } catch (err) {
        console.log('12:10 task failed:', err);
    }
});

//wait for 3:00am to read 100_200
cron.schedule('0 3 * * *', async () => {
    console.log('It is 3:00! Starting the fetch and summary...');
    try {
        await run("3:00");
        console.log(' 3:00 task complete.');
    } catch (err) {
        console.log('3:00 task failed:', err);
    }
});

//wait for 5am to read 200_300 and delete the files to reset
cron.schedule('0 5 * * *', async () => {
    console.log('It is 5:00! Starting the fetch and summary...');
    try {
        await run("5:00");
        console.log(' 5:00 task complete.');
    } catch (err) {
        console.log('5:00 task failed:', err);
    }
});

console.log('Scheduler is running. Standing by for 12:10, 3:00, and 5:00');
*/


//runs the powershell script to get data in DB
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
    
    /*
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
    */
    
    const systemPrompt = `
        ### ROLE
        You are a Senior Data Architect specializing in "Semantic Story Clustering."

        ### INPUT DATA
        Batch of news articles: ${articlesString}

        ### TASK
        1. Group these articles into distinct, granular "Story Clusters."
        2. STRENGTH RULE: A cluster should only be created if at least 2-3 articles share the same specific event or development.
        3. GRANULARITY RULE: Do not use broad categories (e.g., "Sports"). Use specific event titles (e.g., "Ohtani's 60-60 Milestone").
        4. RESIDUAL RULE: Any article that is a unique, standalone story should be grouped into "Global Daily Brief."

        ### OUTPUT FORMAT
        - Return ONLY a comma-separated list of the generated Story Titles.
        - Example: Title A, Title B, Title C
        - NO numbering, NO intro text, NO periods.
        `;

    var topics = await callAI(systemPrompt);
    console.log(topics)
    

    //create an array of promises. execute all promises till all are done then return them all at once
    const assigningTopics = categoryArticleArray.map(async (article)=>{
       
        /*
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
            */
       
       const systemPrompt2 = `
            ### MISSION
            Act as a strict Classification Engine. Assign the provided article to EXACTLY ONE topic from the allowed list.

            ### ALLOWED TOPICS
            [ ${topics} ]

            ### ARTICLE TO CLASSIFY
            Content: ${article.content}
            Title: ${article.title}

            ### MANDATORY RULES
            1. You MUST choose a topic from the "ALLOWED TOPICS" list above.
            2. If no topic fits, you MUST return "Global Daily Brief".
            3. OUTPUT: Return the TOPIC NAME ONLY. 
            4. DO NOT include punctuation, explanations, or quotes.

            ### EXAMPLE OUTPUT
            Apple's Neural Link Breakthrough
            `;
       
        const assignedTopic = await callAI(systemPrompt2) 
        article.topic = assignedTopic?.trim().replace(/['"]+/g, '');
    });
    await Promise.all(assigningTopics);
    return categoryArticleArray
}


// handels calling all the functions.
//if 12:20 only read 0-100 
//if 3:00 only read 100-200
//if 5:00 only read 200-300 and delete files to reset 
//call runDataImport to store the topicJSON after each run
export async function run(time:string) {
    try {
        var originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_0_100.json")
        // var categoryArticleArray = await categorizeNews(originalArticleArray)
        var completedArray = await determineTopics(originalArticleArray)
        await writeToJSON(completedArray)
        console.log("articles written succesfully")
        
        if (time == "12:10"){
            var originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_0_100.json")
           // var categoryArticleArray = await categorizeNews(originalArticleArray)
            var completedArray = await determineTopics(originalArticleArray)
            await writeToJSON(completedArray)
            console.log("articles written succesfully")
        } else if(time == "3:00"){
            var originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_100_200.json")
            //var categoryArticleArray = await categorizeNews(originalArticleArray)
            var completedArray = await determineTopics(originalArticleArray)
            await writeToJSON(completedArray)
            console.log("articles written succesfully")
        }else if(time == "5:00"){
            var originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_200_300.json")
            //var categoryArticleArray = await categorizeNews(originalArticleArray)
            var completedArray = await determineTopics(originalArticleArray)
            await writeToJSON(completedArray)
            console.log("articles written succesfully")
            console.log("deleting the jsons to reset...")
            await Fs.unlink('outputJSONs/newsAPI/trending_news_0_100.json');
            await Fs.unlink('outputJSONs/newsAPI/trending_news_100_200.json');
            await Fs.unlink('outputJSONs/newsAPI/trending_news_200_300.json');
           
        }else{
            console.log("there was an error with fetching based on time")
        }

    } catch(error){
        console.error("Error processing the data: ", error);
    }finally {
        console.log("finished running Main.mts. resuming listening till 12:10, 3:00, and 5:00");
        runDataImport()
    }
}

//run();