// api/chat.ts
//import { chatBot } from "../AI/userSummaries/userSummary.mts";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { item, message } = req.body;

    
    const { chatBot } = await import("../AI/userSummaries/userSummary.mts");

    const aiResponse = await chatBot(item, message);
    res.status(200).send(aiResponse);
  } catch (error: any) {
    console.error(error);
    res.status(500).send("Error: " + error.message);
  }
}