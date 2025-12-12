import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Import résumé text
    const resume = await import("@/lib/resume").then(m => m.default);

    // Build a better prompt with clear instructions
    const prompt = `<s>[INST] You are a helpful assistant answering questions about Miguel Lacanienta's resume.

Resume Information:
${resume.text}

Instructions:
- Answer the question using ONLY information from the resume above
- Be concise and direct
- If the information is not in the resume, say "I don't have that information in the resume."
- Do not make up or infer information

Question: ${question}

Answer: [/INST]`;

    console.log("Calling HuggingFace API...");

    // Call HuggingFace API
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.3,
            top_p: 0.9,
            return_full_text: false
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HuggingFace API error:", errorText);
      
      // Model might be loading
      if (response.status === 503) {
        return NextResponse.json({
          answer: "The AI model is loading. Please try again in a few seconds."
        });
      }
      
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("HuggingFace response:", result);

    // Parse HuggingFace response (they return different formats)
    let answer = "No answer available.";
    
    if (Array.isArray(result) && result.length > 0) {
      // Format 1: Array with generated_text
      answer = result[0]?.generated_text || answer;
    } else if (result?.generated_text) {
      // Format 2: Object with generated_text
      answer = result.generated_text;
    } else if (typeof result === 'string') {
      // Format 3: Direct string
      answer = result;
    }

    // Clean up the answer (remove prompt repetition if present)
    if (answer.includes("[/INST]")) {
      answer = answer.split("[/INST]").pop()?.trim() || answer;
    }

    // Remove any remaining instruction tags
    answer = answer.replace(/<s>|<\/s>|\[INST\]|\[\/INST\]/g, "").trim();

    // If answer is too short or empty, provide fallback
    if (!answer || answer.length < 3) {
      answer = "I couldn't generate a proper response. Please try rephrasing your question.";
    }

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to process request",
        answer: "Sorry, there was an error processing your question. Please try again."
      },
      { status: 500 }
    );
  }
}
