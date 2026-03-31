import { writeFile } from "fs";
import { type newsArticle, callAI, readJSON, tempreadJSON } from "../AIExportedFunctions/exportedFunctions.mts";
import fs from 'fs';

function quickWrite(content: string) {
    fs.writeFileSync('test.txt', content, 'utf-8');
}


//this is the object structure of the summarized articles in a JSON
interface summarizedArticle{
    source_names: string[],
    authors: string[],
    ai_title:string,
    ai_description:string,
    urls: string[],
    category: string,
    topic:string,
    summary:string,
}



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


// the main function, handles calling other functions. loops through every article
//create content and description arrays and sends the arrays to the summarizeContent or summarizeDescription functions
//finally it uses output of previous functions and calls constructJSON
async function summaryManager(articleObjArray: newsArticle[]){
    let contentArray:Array<string> = []
    let descriptionArray:Array<string> = []
    let titleArray:Array<string>=[]
    for(const article of articleObjArray){
        let content:string = article.content
        let description:string= article.description
        let title = article.title
        contentArray.push(content)
        descriptionArray.push(description)
        titleArray.push(title)
    }


    var summarizedContent:string= await summarizeContent(contentArray)
    var summarizedDescription:string = await summarizeDescription(descriptionArray)
    var summarizedTitle:string = await summarizeTitle(titleArray)
    var completedObject = await constructJSON(articleObjArray,summarizedContent,summarizedDescription,summarizedTitle)
    writeSummarizedJSON(completedObject)
}



//takes the content from all articles in an array as parameter 
// pass the whole array for the ai to check out and respond with summary
// returns a string response
async function summarizeContent(contentArray: Array<string>){
   const sysPrompt = `
        You are a concise news editor. 

        INPUT DATA: ${JSON.stringify(contentArray)}

        TASK:
        1. Write a single, 3-sentence "Executive Summary" paragraph.
        2. Provide a SINGLE bulleted list titled "Three Major Highlights".
        3. ONLY provide 3 bullets total for the entire topic.

        STRICT RULES:
        - Do NOT repeat the "Key Takeaways" header.
        - Do NOT provide a separate list for each article.
        - Combine all information into ONE unified response.
        `;

    var response = await callAI(sysPrompt)
    
    return response
}


//takes the descriptions from all articles in an array as parameter 
// pass the whole array for the ai to check out and respond with summary
// returns a string response
async function summarizeDescription(descriptionArray: Array<string>){
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

//takes in the summarized content and descriptions and builds the summarizedArticle structure
//uses articleArray and the summized things to create the object summarizedArticle
//returns the object
async function constructJSON(articleObjArray:newsArticle[],summarizedContent:string,summarizedDescription:string,summarizedTitle:string){
   //console.log("\nTHIS IS SUMMARY:")
    //console.log(summarizedContent)
    //console.log("\nTHIS IS description:")
   // console.log(summarizedDescription)
    const summaryObjArray:summarizedArticle[]=[]
    const article_sources: string[] = []
    const authors:string[]= []
    const urls:string[]=[]
    
    for(const article of articleObjArray){
        article_sources.push(article.source.name)
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
        category: articleObjArray[0].category ?? "unkown",
        topic:articleObjArray[0].topic ?? "unkown",
        summary:summarizedContent,
    }

    return summarizedArticle

}


//write the object to a json
async function writeSummarizedJSON(summarizedObject:summarizedArticle){
    fs.writeFileSync("outputJSONs/summarizedJSON/summarizedTopic.json",JSON.stringify(summarizedObject, null,2),"utf8")
}



var catArray = await tempReadMethodForTesting()
summaryManager(catArray)