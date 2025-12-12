import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { question } = await req.json();

  // Import résumé text
  const resume = await import("@/lib/resume").then(m => m.default);

  // Build prompt
  const prompt = `
You are a résumé assistant.
Answer the user's question using ONLY the information inside the résumé.

Résumé:
${resume.text}

User question: ${question}

If the answer is not in the résumé, reply only with: "No answer available."
`;

  // HuggingFace request
  const response = await fetch(
    "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    }
  );

  // Parse HF output (correct format)
  const result = await response.json();

  const answer =
    result?.generated_text ??
    result?.[0]?.generated_text ??
    "No answer available.";

  return NextResponse.json({ answer });
}
