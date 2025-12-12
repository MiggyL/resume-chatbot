import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { question } = await req.json();

  // IMPORT YOUR RESUME TEXT
  const resume = await import("@/lib/resume").then(m => m.default);

  // CALL HUGGINGFACE INFERENCE
  const response = await fetch(
    "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `
You are a résumé assistant. 
Answer the user's question using ONLY the information inside the résumé.

Résumé:
${resume}

User question: ${question}

If the answer is not in the résumé, reply: "No answer available."
`
      })
    }
  );

  const result = await response.json();

  return NextResponse.json({
    answer: result?.[0]?.generated_text ?? "No answer available."
  });
}
