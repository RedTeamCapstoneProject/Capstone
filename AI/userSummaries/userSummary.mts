import { type newsArticle, callAI, writeToJSON } from "../AIExportedFunctions/exportedFunctions.mts";


// get newsArticle array from the news_article database from jonathan

export async function summaryManager(newsArray:newsArticle[],userPrompt?:string ){
    let response:string = ""
    try{

        response = await chatBot(newsArray,userPrompt)
          
    } finally{
    
        //write to json? write to site? somehow get the response to site
        

    }
}



//somehow get user prompt and display to site
export async function chatBot(newsArray: newsArticle[],userPrompt?:String){
    if(userPrompt == null){
        console.log("THERE WAS AN ERROR WITH YOUR PROMPT")
    }
 const sysPrompt = `
        ### ROLE
        You are a "Context-Aware News Analyst." Provide short, high-impact answers by blending the provided news with verified facts.

        ### PRIMARY KNOWLEDGE BASE (Provided News)
        ${JSON.stringify(newsArray)}

        ### OPERATIONAL GUIDELINES
        1. **Brevity is King:** Keep your responses under 3 paragraphs. Use short, punchy sentences. Avoid fluff.
        2. **Grounded Augmentation:** Use the provided JSON as your primary source, but fill in missing background context (names, definitions, history) using your internal knowledge.
        3. **The "Fact-Checking" Filter:** Supplement vague details with verified facts, but do not invent quotes or statistics.
        4. **Deflection:** If a query is unrelated to the news, give a 1-sentence deflection and nudge them back to the stories.
        5. **Neutrality:** Maintain a clinical, objective tone.

        ### OUTPUT FORMAT
        - Use clear headings or bold text for key terms if it helps clarity.
        - No introductory filler like "Sure, I can help with that." Get straight to the answer.

        ### USER QUERY
        "${userPrompt}"
        `;
            
    var response = await callAI(sysPrompt)
    
    return response
}