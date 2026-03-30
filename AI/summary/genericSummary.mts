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
    for(const article of articleObjArray){
        let content:string = article.content
        let description:string= article.description
        contentArray.push(content)
        descriptionArray.push(description)
    }


    var summarizedContent:string= await summarizeContent(contentArray)
    var summarizedDescription:string = await summarizeDescription(descriptionArray)
    await constructJSON(summarizedContent,summarizedDescription)

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


//takes in the summarized content and descriptions and builds the summarizedArticle structure
//uses articleArray and the summized things to create the object summarizedArticle
//finally it writes the summarizedJSON
async function constructJSON(summarizedContent:string,summarizedDescription:string){
    console.log("\nTHIS IS SUMMARY:")
    console.log(summarizedContent)
    console.log("\nTHIS IS description:")
    console.log(summarizedDescription)
    
    //quickWrite(summarizedContent)  //just for testing
    

}



var catArray = await tempReadMethodForTesting()
summaryManager(catArray)