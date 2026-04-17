// api/chat.ts
import { chatBot } from "../AI/userSummaries/userSummary.mjs";

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { item, message } = req.body;
    
    // Call your existing logic that uses Groq/Process.env
    const aiResponse = await chatBot(item, message);

    // Send the string back to your frontend
    res.status(200).send(aiResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing AI request");
  }
}