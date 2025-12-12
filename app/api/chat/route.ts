import { NextResponse } from "next/server";
import resume from "../../../lib/resume";

export async function POST(req: Request) {
  const { question } = await req.json();

  if (!question) {
    return NextResponse.json({ answer: "Please enter a question." });
  }

  // Build the prompt for the LLM
  const prompt = `
You are a helpful assistant that answers questions based ONLY on the resume information below.

RESUME:
${resume.text}

Now answer this question clearly and directly:
"${question}"
`;

  const response = await fetch(
    "https://api-inference.huggingface.co/models/google/gemma-2b-it",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.4
        }
      })
    }
  );

  const data = await response.json();
  const answer = data?.[0]?.generated_text || "No answer available.";

  return NextResponse.json({ answer });
}
