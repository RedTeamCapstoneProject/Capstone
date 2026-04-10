import { type newsArticle, callAI, writeToJSON } from "../AIExportedFunctions/exportedFunctions.mts";


// get newsArticle array from the news_article database from jonathan

export async function summaryManager(newsArray:newsArticle[],summaryType:string,userPrompt?:string ){
    let response:string = ""
    try{
        switch(summaryType){
            case "likeImFive":
                response = await likeIm5(newsArray)
                break;
            case "fiveWs":
                response = await fiveW(newsArray)
                break;
            case "chatbot":
                response = await chatBot(newsArray,userPrompt)
                break;
            default:
                console.log("ERROR FOR SUMMARY TYPE")
        }
    } finally{
    
        //write to json? write to site? somehow get the response to site

    }
}


async function likeIm5(newsArray: newsArticle[]){

     const sysPrompt = `
            You are a world-class teacher specializing in explaining complex topics to five-year-olds. 

            INPUT DATA: 
            ${JSON.stringify(newsArray)}

            TASK:
            1. Explain the "Main Gist" of these articles using very simple language.
            2. Use a relatable analogy (e.g., comparing a stock market to a lemonade stand or a computer virus to a cold).
            3. If the input data is missing context (like who a famous person is or why a technology matters), use your internal knowledge to fill those gaps accurately.
            4. TONE: Warm, encouraging, and clear.

            STRICT RULES:
            - NO BIG WORDS: If you must use a complex term (e.g., "Quantum"), explain it using a simple comparison (e.g., "Magic math that's super fast").
            - NO HALLUCINATIONS: Only add outside info that is a widely accepted fact. If you don't know a specific detail, omit it.
            - NO BULLET POINTS: Write this as a short, cohesive story or explanation.
            - LENGTH: Keep it under 100 words.
            `;
                        
    var response = await callAI(sysPrompt)
    
    return response
}


async function fiveW(newsArray: newsArticle[]){

     const sysPrompt = `
            You are a Fact-Extraction Engine. Your mission is to identify the core components of a news story with absolute precision.

            INPUT DATA: 
            ${JSON.stringify(newsArray)}

            TASK:
            Extract the "Five Ws" from the provided articles. If the articles provide conflicting information, prioritize the most recent or widely cited detail. 

            FORMATTING RULES:
            You must respond strictly in the following format:
            Who: [Main person, group, or organization involved]
            What: [The specific event or action that took place]
            When: [Date, time, or relative timeframe of the event]
            Where: [Location, city, country, or digital platform]
            Why: [The cause, motive, or reason behind the event]

            STRICT GUIDELINES:
            1. NO HALLUCINATIONS: If a specific "W" is not mentioned in the text and cannot be verified as common knowledge (e.g., the current year is 2026), write "Not specified."
            2. NO SPECULATION: Do not guess motives. Only report stated "Whys."
            3. CONCISENESS: Limit each "W" to a maximum of 20 words.
            4. TONE: Purely factual and clinical. No introductory or concluding text.
            `;
            
    var response = await callAI(sysPrompt)
    
    return response
}


//somehow get user prompt and display to site
async function chatBot(newsArray: newsArticle[],userPrompt?:String){
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