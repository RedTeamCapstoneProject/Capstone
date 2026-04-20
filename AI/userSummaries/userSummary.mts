import {callAI} from "../AIExportedFunctions/exportedFunctions.mts";
type SummaryItem = {
  id: number | string;
  category?: string | null;
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string | null;
  likeIm5?: string | null;
  "5ws"?: string | null;
  source_names?: string[] | null;
  authors?: string[] | null;
  urls?: string[] | null;
  created_at?: string | null;
};

type SummariesResponse = { data?: SummaryItem[] | SummaryItem };

// get newsArticle array from the news_article database 
/*
export async function summaryManager(newsArray:SummaryItem|null,userPrompt:string ){
    let response:string = ""
    try{

        //response = await chatBot(newsArray,userPrompt)
          
    } finally{
    
        //write to json? write to site? somehow get the response to site
        

    }
}
*/


export async function chatBot(newsArray:SummaryItem|null,userPrompt?:String):Promise<string>{
    if(userPrompt == null){
        return "there was an error sending your prompt"
    }
    if ((newsArray==null)){
        return "there was an error fetching the content of this article"
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