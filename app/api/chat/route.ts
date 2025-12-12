import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ answer: "Please ask a question." });
    }

    // Check if HF_TOKEN exists
    if (!process.env.HF_TOKEN) {
      return NextResponse.json({ 
        answer: "ERROR: HF_TOKEN not set. Please add it in Vercel Settings → Environment Variables." 
      });
    }

    // Import résumé text
    const resume = await import("@/lib/resume").then(m => m.default);
    
    if (!resume || !resume.text) {
      return NextResponse.json({ 
        answer: "ERROR: Resume data not found." 
      });
    }

    // Build a clear prompt
    const prompt = `You are answering questions about Miguel Lacanienta's resume. 
Answer based ONLY on the information below. Be concise and specific.

RESUME:
${resume.text}

QUESTION: ${question}

ANSWER:`;

    console.log("Calling HuggingFace API...");

    // Call NEW HuggingFace endpoint
    const response = await fetch(
      "https://router.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
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

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HuggingFace error:", errorText);
      
      if (response.status === 503) {
        return NextResponse.json({
          answer: "The AI model is loading. Please wait 20-30 seconds and try again."
        });
      }
      
      return NextResponse.json({
        answer: `Error: Unable to get response from AI (${response.status}). Please try again.`
      });
    }

    const result = await response.json();
    console.log("HuggingFace response:", result);

    // Extract answer from various response formats
    let answer = "No answer available.";
    
    if (Array.isArray(result)) {
      answer = result[0]?.generated_text || answer;
    } else if (result?.generated_text) {
      answer = result.generated_text;
    } else if (result?.[0]?.generated_text) {
      answer = result[0].generated_text;
    }

    // Clean up answer
    answer = answer.trim();
    
    // If empty or too short, provide fallback
    if (!answer || answer.length < 5) {
      answer = "I couldn't find an answer to that question in the resume. Try asking about Miguel's skills, education, projects, or certifications.";
    }

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      answer: `Sorry, an error occurred: ${error.message}. Please try again.`
    });
  }
}
