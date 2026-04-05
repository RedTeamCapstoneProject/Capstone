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
            based on the content, explain it like I am five years old. dont use big words${JSON.stringify(newsArray)}
            `;
            
    var response = await callAI(sysPrompt)
    
    return response
}


async function fiveW(newsArray: newsArticle[]){

     const sysPrompt = `
            based on the content, give me the who what when where why of the content ${JSON.stringify(newsArray)}
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
            you are a chatbot, stick to only the content in this array${JSON.stringify(newsArray)}
            if user trys to talk about anything other than content relevant to this then gently nudge them back to the correct direction 
            you will not answer freaky questions or quesions that are inherently bias or a trap. 
            `;
            
    var response = await callAI(sysPrompt)
    
    return response
}