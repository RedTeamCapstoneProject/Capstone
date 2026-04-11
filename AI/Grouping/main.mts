//import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { type newsArticle, callAI, readJSON, writeToJSON } from "../AIExportedFunctions/exportedFunctions.mts";
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import chokidar from 'chokidar';
import cron from 'node-cron';
import Fs from 'node:fs/promises';


//MAKE DYNAMIC KEY SWITCHING FOR AI CALLS GEMINI OR GROQ


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

    // We add { env: process.env } as the second argument
    exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { env: process.env }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution Error: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`PowerShell Error: ${stderr}`);
            // Note: Some PS warnings show up here; check if it actually failed
            return;
        }

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


//takes in the news article array and determins the topics that fits with each article
//sysprompt1 goes over whole json and writes topics to csv
//sysprompt2 looks at the topics in csv and assigns them to each individual article.
async function determineTopics(categoryArticleArray: newsArticle[]){
    
   // console.log(`\n working on: ${articles}`); 

   const articlesString = JSON.stringify(categoryArticleArray);
    
   //the list that contains all topcs generated for the run cycle
    const path = `AI/Grouping/topicList.csv`
    var content = fs.readFileSync(path).toString()
    let existingCSVTopics = content.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    const csvTopicsString = existingCSVTopics.join(", ");
   
    /*
    const systemPrompt = `
        ### ROLE
        You are a Senior Data Architect specializing in "Semantic Story Clustering."

        ### INPUT DATA
        Batch of news articles: ${articlesString}

        ### TASK
        1. Group these articles into distinct, granular "Story Clusters."
        2. STRENGTH RULE: A cluster should only be created if at least 2-3 articles share the same specific event or development.
        3. GRANULARITY RULE: Do not use broad categories (e.g., "Sports"). Use specific event titles (e.g., "Ohtani's 60-60 Milestone").
        4. If an article doesn't fit into a specific cluster, give it a new one that is unique to the content within the article.

        ### OUTPUT FORMAT
        - Return ONLY a comma-separated list of the generated Story topics.
        - Example: Topic A, Topic B, Topic C
        - NO numbering, NO intro text, NO periods.
        `;
    */
    
    const systemPrompt=`
       ### ROLE
        You are a Senior Forensic News Editor. Your job is to detect and name unique "News Stories" within a batch of articles while comparing them to an existing archive.

        ### EXISTING TOPICS (MEMORY)
        [ ${csvTopicsString} ]

        ### NEW ARTICLES TO PROCESS
        ${articlesString}

        ### MANDATORY EXECUTION RULES (CRITICAL)
        1. **ZERO CATEGORIES:** Never use broad words like "Sports," "Politics," "Business," or "Basketball."
        2. **THE TEAM-LOCK RULE:** You are strictly forbidden from grouping different teams under one name. "UConn" is NOT "Alabama." "Tesla" is NOT "Ford." If the team/company is different, it is a NEW topic.
        3. **GRANULARITY:** Use a 3-5 word specific headline format (e.g., "Tennessee Lady Vols Transfers" instead of "College Basketball").
        4. **DEDUPLICATION:** - Check the EXISTING TOPICS first. If a story fits exactly, do NOT output it.
        - If multiple NEW articles are about the same specific event, generate ONLY ONE topic for them.
        5. **NO LAZINESS:** You must account for every article provided. Do not truncate the list. Do not summarize the task.
        6. **SILENT OUTPUT:** Return ONLY a comma-separated list of the new specific topics found. No intros, no apologies, no quotes, no newlines.

        ### FAIL-SAFE
        If no new topics are found, return the word "None".

        ### TARGET OUTPUT FORMAT
        Topic A, Topic B, Topic C
        `;
                    
   
        var response = await callAI(systemPrompt);

        //if the topic is new to the lsit then add it to the list for the cycle
        if (response.toLowerCase() !== "none") {
            const newTopics = response.split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
                
            newTopics.forEach(topic => {
                if (!existingCSVTopics.includes(topic)) {
                    fs.appendFileSync(path, topic + '\n');
                    existingCSVTopics.push(topic); 
                 }           
            });
        }
        console.log("topics written")



    const updatedTopicList = existingCSVTopics.join(", ");    //create an array of promises. execute all promises till all are done then return them all at once
    const assigningTopics = categoryArticleArray.map(async (article)=>{
       
        
    
       const systemPrompt2 = `
            #### MISSION
            Act as a Zero-Latency Classification Router. Your only job is to output a single string representing the topic name.

            ### ALLOWED TOPICS
            [ ${updatedTopicList} ]

            ### ARTICLE DATA
            Title: ${article.title}
            Content: ${(article.content)}

            ### STRICT OUTPUT PROTOCOL (CRITICAL)
            1. **Match or Create:** If the article fits an "ALLOWED TOPIC," return it exactly. If not, generate a new 3-5 word granular topic (e.g., "Apple Security Patch" instead of just "Apple").
            2. **NO CONTEXT:** Do not explain why you chose a topic. Do not say "Based on..." or "None of the topics match." 
            3. **FORBIDDEN:** It is strictly forbidden to use a newline (\n). Your entire response must be a single line of text.
            4. **NO PUNCTUATION:** Do not use quotes, periods, or colons.
            5. **FAIL-SAFE:** If you are unsure, output the 3 most important words from the article title.

            ### TARGET OUTPUT FORMAT
            Topic Name Only
            `;
       
        
        
        const assignedTopic = await callAI(systemPrompt2) 
        article.topic = assignedTopic?.trim().replace(/['"]+/g, '');
    });

    await Promise.all(assigningTopics);
    return categoryArticleArray
}




//FIX THE RUN FUNCTION TO CHECK FOR TIMES

// handels calling all the functions.
//if 12:20 only read 0-100 
//if 3:00 only read 100-200
//if 5:00 only read 200-300 and delete files to reset 
//call runDataImport to store the topicJSON after each run
export async function run() {
    try {
        /*
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
            console.log("deleting the jsons and topic csv to reset...")
            await Fs.unlink('outputJSONs/newsAPI/trending_news_0_100.json');
            await Fs.unlink('outputJSONs/newsAPI/trending_news_100_200.json');
            await Fs.unlink('outputJSONs/newsAPI/trending_news_200_300.json');
            fs.writeFileSync('AI/Grouping/topicList.csv', '');
           */
          
            try{
                let originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_0_100.json")
            // var categoryArticleArray = await categorizeNews(originalArticleArray)
                let completedArray = await determineTopics(originalArticleArray)
                await writeToJSON(completedArray)
                console.log("first batch written... waiting 1 minute")
                await new Promise(resolve => setTimeout(resolve, 100000)); // 100,000ms = 1 minute

            }catch(error){
                 console.error("Error processing batch 1 data: ", error);

            }finally{
                console.log("finished processing batch 1, running db script and waiting 5 minutes");
                runDataImport()
                await new Promise(resolve => setTimeout(resolve, 300000)); // 300,000ms = 5 minutes

            }
            try{
                let originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_100_200.json")
            // var categoryArticleArray = await categorizeNews(originalArticleArray)
                let completedArray = await determineTopics(originalArticleArray)
                await writeToJSON(completedArray)
                console.log("second batch written... waiting 1 minute")

                await new Promise(resolve => setTimeout(resolve, 100000)); // 100,000ms = 1 minute

            }catch(error){
                 console.error("Error processing batch 2 data: ", error);

            }finally{
                console.log("finished processing batch 2, running db script and waiting 5 minutes");
                runDataImport()
                await new Promise(resolve => setTimeout(resolve, 300000)); // 300,000ms = 5 minutes

            }
           
            try{
                let originalArticleArray = await readJSON("outputJSONs/newsAPI/trending_news_200_300.json")
            // var categoryArticleArray = await categorizeNews(originalArticleArray)
                let completedArray = await determineTopics(originalArticleArray)
                await writeToJSON(completedArray)
                console.log("third batch written... waiting 1 minute")

                await new Promise(resolve => setTimeout(resolve, 100000)); // 100,000ms = 1 minute
            }catch(error){
                 console.error("Error processing batch 3 data: ", error);

            }finally{
                console.log("finished processing batch 3, running db script and waiting 5 minutes");
                runDataImport()
                await new Promise(resolve => setTimeout(resolve, 300000)); // 300,000ms = 5 minutes

            }
        
           
        

    } catch(error){
        console.error("Error processing the data: ", error);
    }finally {
            console.log("articles written succesfully")
            console.log("deleting the jsons and topic csv to reset...")
            fs.writeFileSync('outputJSONs/newsAPI/trending_news_0_100.json', '');
            fs.writeFileSync('outputJSONs/newsAPI/trending_news_100_200.json','');
            fs.writeFileSync('outputJSONs/newsAPI/trending_news_200_300.json','');
            fs.writeFileSync('AI/Grouping/topicList.csv', '');
    }
}




/*
const startAction = async () => {
    // Get current hour in UTC (GitHub Runners use UTC)
    // 12:10 AM EST is 4:10 AM UTC
    // 3:00 AM EST is 7:00 AM UTC
    // 5:00 AM EST is 9:00 AM UTC
    const hourUTC = new Date().getUTCHours();
    const minuteUTC = new Date().getUTCMinutes();

    let timeParam = "";

    if (hourUTC === 4) {
        timeParam = "12:10";
    } else if (hourUTC === 7) {
        timeParam = "3:00";
    } else if (hourUTC === 9) {
        timeParam = "5:00";
    } else {
        // This allows you to still test manually if needed
        console.log("Not a scheduled window. Defaulting to 12:10 for testing...");
        timeParam = "12:10";
    }

    console.log(`Dispatcher: Waking up for ${timeParam} batch...`);
    await run(timeParam);
};


startAction().catch(err => {
    console.error(err);
    process.exit(1);
});
*/
run();