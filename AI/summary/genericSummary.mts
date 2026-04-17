import { writeFile } from "fs";
import { type newsArticle, callAI, readJSON, tempreadJSON } from "../AIExportedFunctions/exportedFunctions.mts";
import fs from 'fs';
import { title } from "process";
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from "groq-sdk";


const finalSummaryDatabase: summarizedArticle[] = [];
/*
function quickWrite(content: string) {
    fs.writeFileSync('test.txt', content, 'utf-8');
}
*/



export const runSummaryToDB = () => {
    const currentFile = fileURLToPath(import.meta.url);
    const scriptPath = path.resolve(path.dirname(currentFile), '../../scripts/summaryToDB.ps1');

    console.log('--- Triggering Summary to DB Sync ---');

    return new Promise((resolve) => {
        exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { env: process.env }, (error, stdout, stderr) => {
            if (error) {
                console.error(`PS Execution Error: ${error.message}`);
            }
            console.log(`PS Output: ${stdout}`);
            resolve(true);
        });
    });
};







//this is the object structure of the summarized articles in a JSON
interface summarizedArticle{
    source_names: string[],
    authors: string[],
    ai_title:string,
    ai_description:string,
    urls: string[],
    url_to_image: string,
    category: string,
    topic:string,
    summary:string,
    "5ws"?: string | null;
    likeIm5?: string | null;
}


/*
async function tempReadMethodForTesting(){
    var array:newsArticle[] =  await tempreadJSON("AI/Grouping/outputTestData.json")
    //console.log("Raw Array Length:", array?.length); // If this is 0, the file read failed to find data
    //console.log(array)
    var objArray:newsArticle[] = []
    for(const article of array){
        if (article.topic == "Shohei Ohtanis Historic Season"){
            objArray.push(article)
        }
    }
    //console.log(objArray)
    return objArray
}
*/

// the main function, handles calling other functions. loops through every article
//create content and description arrays and sends the arrays to the summarizeContent or summarizeDescription functions
//finally it uses output of previous functions and calls constructJSON
export async function summaryManager(articleObjArray: newsArticle[],numberOfTopics:number){
    console.log(articleObjArray.length)
    let contentArray:Array<string> = []
    let descriptionArray:Array<string|null> = []
    let titleArray:Array<string>=[]
    for(const article of articleObjArray){
        let content:string = article.content
        let description:string= article.description
        let title = article.title
        contentArray.push(content)
        descriptionArray.push(description)
        titleArray.push(title)
    }

    
    var summarizedContent:string= await summarizeContent(contentArray,descriptionArray,titleArray)
    var summarizedDescription:string = await summarizeDescription(descriptionArray)
    var summarizedTitle:string = await summarizeTitle(titleArray)
    var likeImfive:string = await likeIm5(articleObjArray)
    var fivews:string = await fiveWs(articleObjArray)
    var completedObject = await constructJSON(articleObjArray,summarizedContent,summarizedDescription,summarizedTitle,likeImfive,fivews)
    finalSummaryDatabase.push(completedObject);
    console.log(`Progress: ${finalSummaryDatabase.length} / ${numberOfTopics}`);

    if (finalSummaryDatabase.length === Number(numberOfTopics)) {
        console.log("All topics summarized. Writing final JSON...");
        await writeSummarizedJSON(finalSummaryDatabase);


    }
}



//takes the content from all articles in an array as parameter 
// pass the whole array for the ai to check out and respond with summary
// returns a string response
async function summarizeContent(contentArray: Array<string>,descriptionArray: Array<string|null>,titleArray: Array<string>){
   /*
    const sysPrompt = `
        You are a concise news editor. 

        INPUT DATA: ${JSON.stringify(contentArray)}

        TASK:
        1. Write a single, 7-sentence "Executive Summary" paragraph.
        2. Provide a SINGLE bulleted list titled "Three Major Highlights".
        3. ONLY provide 3 bullets total for the entire topic.
        4. if there are key terms then explain them in a easy to understand way. 
        5. if there are major details missing, fill them in.

        STRICT RULES:
        - Do NOT repeat the "Key Takeaways" header.
        - Do NOT provide a separate list for each article.
        - Combine all information into ONE unified response.
        `;
        */
       const sysPrompt =`
           
            You are a Senior Research Editor. Your goal is to create a definitive brief by synthesizing the provided Input Data with verified real-world facts to ensure technical and historical accuracy.

            **TASK:**
            1. **Executive Summary:** Write exactly one paragraph of seven sentences. You must use the provided data but cross-reference it with your internal knowledge to fill in missing "Who, What, Where, and Why" details. If any terms are complex or specific, define them clearly within the narrative flow.
            2. **Three Major Highlights:** Provide a single bulleted list of exactly three points. These must represent the most critical legal, social, or financial implications of the topic.
            3. **Neutrality & Fact-Correction:** Remove any biased or "loaded" language found in the input data (e.g., replace "performative antics" with "legal challenge"). Ensure all dates, names, and legal claims are factually accurate for the current year (2026).
            4. this summary should include only explicitly stated facts, removing all speculation, general explanations, and filler, while making it concise and clear in 7 sentences.”
            
            **STRICT RULES:**
            - Do NOT use the header "Key Takeaways."
            - Do NOT separate the response by article or source. 
            - Provide ONE unified, professional response.
            - Strictly adhere to the 7-sentence summary and 3-bullet highlight constraints.
            - dont analyize just keep it to strict facts 

            **INPUT DATA:**
            contents: ${JSON.stringify(contentArray)}
            descriptions: ${JSON.stringify(descriptionArray)}
            titles: ${JSON.stringify(titleArray)}
            `

    var response = await callAI(sysPrompt)
    
    return response
}


//takes the descriptions from all articles in an array as parameter 
// pass the whole array for the ai to check out and respond with summary
// returns a string response

async function summarizeDescription(descriptionArray: Array<string|null>){
    const isAllNull = descriptionArray.every(element => element === null);
    if(isAllNull){
        return ""
    }
    const isAllEmpty = descriptionArray.every(element => element === "");
    if(isAllEmpty){
        return ""
    }
    const sysPrompt = `
            You are a master copywriter for a high-end news app. 

            INPUT: 
            I am providing an array of short descriptions from multiple articles on the same story: ${JSON.stringify(descriptionArray)}

            YOUR TASK:
            Synthesize these into ONE single, compelling sentence (maximum 25 words).

            GUIDELINES:
            1. FOCUS on the most "shocking" or "impactful" detail from the group.
            2. USE active, punchy verbs (e.g., "Shatters," "Unveils," "Ignites").
            3. THE "CLIFFHANGER" RULE: Provide enough detail to be informative, but leave the user wanting to click to see the full summary.
            4. NO BULLSHIT: Avoid phrases like "In a surprising turn of events" or "Click to find out more." Let the facts create the intrigue.
            `;
            
    var response = await callAI(sysPrompt)
    
    return response

}

// given all the titles summarize them into one
async function summarizeTitle(titleArray: Array<string>){
    const sysPrompt = `You are an expert Headlines Editor for a global news agency.
        INPUT:
        An array of titles from different news outlets covering the same story: ${JSON.stringify(titleArray)}

        YOUR TASK:
        Create ONE single, cohesive headline that encompasses the core news shared across all these articles.

        CONSTRAINTS:
        1. LENGTH: Keep it under 10 words.
        2. STYLE: Use "Title Case" (Capitalize Major Words).
        3. TONE: Neutral, authoritative, and punchy.
        4. NO CLICKBAIT: Avoid sensationalist fluff like "You won't believe..." or "Shocking reveal."
        5. SYNTHESIS: If the articles mention different aspects (e.g., one mentions a discovery, another mentions the cost), try to include both if space allows (e.g., "NASA Discovers Lunar Water, Signaling Multi-Billion Dollar Space Race").

        OUTPUT:
        Return ONLY the headline text. No intro, no quotes, no explanation.
        `;
    var response = await callAI(sysPrompt)
    return response
}



async function likeIm5(newsArray: newsArticle[]){

     const sysPrompt = `
            You are a master storyteller for children. Your goal is to explain the "Big News" so a five-year-old understands not just what is happening, but who is involved and why it matters.

            INPUT DATA: 
            ${JSON.stringify(newsArray)}

            TASK:
            1. **The Story:** Explain the main events using a "Once upon a time" or "Imagine this" narrative style. 
            2. **The Analogy:** Use a high-stakes but relatable playground or school analogy.
            3. **The 'Who':** You MUST mention at least 2-3 specific people or teams from the input data but give them friendly labels (e.g., "The New York Jets team").
            4. **The Big Why:** Explain the goal (winning, fixing a problem, or helping others).

            STRICT RULES:
            - **NO JARGON:** Replace "Draft Picks" with "Chances to pick the best friends" or "Golden Tickets."
            - **BE COMPLETE:** Don't just explain the concept of a Draft; explain *this specific* Draft where teams like the Jets and Cowboys are trying to get better.
            - **LENGTH:** 60-90 words.
            - **NO BULLETS:** One cohesive, warm paragraph.
            `;
                        
    var response = await callAI(sysPrompt)
    
    return response
}


async function fiveWs(newsArray: newsArticle[]){

     const sysPrompt = `
            You are a Senior News Intelligence Analyst. Your goal is to provide a definitive "SITREP" (Situation Report) by synthesizing input data with confirmed contextual facts.

            INPUT DATA: 
            ${JSON.stringify(newsArray)}

            TASK:
            Extract the "Five Ws." You must cross-reference the input with your internal knowledge of the current year (2026) to ensure completeness. For example, if "NFL Draft" is mentioned, you know the "Why" is the annual recruitment of college athletes.

            FORMATTING RULES:
            Who: [Primary entities/stakeholders. Be specific: name the key teams/people.]
            What: [The central action or event. Use a punchy, informative summary.]
            When: [The specific date or window. Use current knowledge for 2026 events.]
            Where: [Physical location or platform. Include city/venue if known globally.]
            Why: [The fundamental purpose or goal. Explain the "so what" of the event.]

            STRICT GUIDELINES:
            1. INFERENCE IS ALLOWED: Use context to fill gaps. If the text says "Draft in Pittsburgh," the Where is "Pittsburgh, Pennsylvania." 
            2. NO GENERIC ANSWERS: Avoid "Not specified" unless the information is truly unknowable. Use logical deduction based on the topic.
            3. MAX 25 WORDS per "W": Be detailed but efficient.
            4. TONE: Objective, professional, and definitive.
            `;
            
    var response = await callAI(sysPrompt)
    
    return response
}




//takes in the summarized content and descriptions and builds the summarizedArticle structure
//uses articleArray and the summized things to create the object summarizedArticle
//returns the object
async function constructJSON(articleObjArray:newsArticle[],summarizedContent:string,summarizedDescription:string,summarizedTitle:string,likeIfive:string,fivews:string){
   //console.log("\nTHIS IS SUMMARY:")
    //console.log(summarizedContent)
    //console.log("\nTHIS IS description:")
   // console.log(summarizedDescription)
    const summaryObjArray:summarizedArticle[]=[]
    const article_sources: string[] = []
    const authors:string[]= []
    const urls:string[]=[]
    
    
    for(const article of articleObjArray){
        article_sources.push(article.source_name)
        authors.push(article.author ?? "Unknown Author")
        urls.push(article.url)

    }
    //quickWrite(summarizedContent)  //just for testing
    
     const summarizedArticle:summarizedArticle = {
        source_names: article_sources,
        authors: authors,
        ai_title:summarizedTitle,
        ai_description:summarizedDescription,
        urls: urls,
        url_to_image: articleObjArray[0].urlToImage ?? "unknown",
        category: articleObjArray[0].category ?? "unknown",
        topic:articleObjArray[0].topic ?? "unknown",
        summary:summarizedContent,
        "5ws":  fivews,
        likeIm5:likeIfive

    }

    return summarizedArticle

}




//write the object to a json
async function writeSummarizedJSON(finalSummarizedList:summarizedArticle[]){
const filePath = "outputJSONs/summarizedJSON/summarizedTopic.json";
    try{
        const dir = "outputJSONs/summarizedJSON";
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the full batch as a proper JSON array
        fs.writeFileSync(filePath, JSON.stringify(finalSummarizedList, null, 2), "utf8");
        console.log(`Success! saved ${finalSummarizedList.length} topics to ${filePath}`);
        await new Promise(resolve => setTimeout(resolve, 10000));

    }catch(err){
        console.log("error")
    }finally{
       //await runSummaryToDB()
    }
}
//var catArray = await tempReadMethodForTesting()
//summaryManager(catArray)
