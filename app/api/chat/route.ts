import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ answer: "Please ask a question." });
    }

    // Check if GEMINI_API_KEY exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        answer: "ERROR: GEMINI_API_KEY not set. Please add it in Vercel Settings → Environment Variables." 
      });
    }

    // Import résumé text
    const resume = await import("@/lib/resume").then(m => m.default);
    
    if (!resume || !resume.text) {
      return NextResponse.json({ 
        answer: "ERROR: Resume data not found." 
      });
    }

    // Build prompt
    const prompt = `You are a helpful assistant answering questions about Miguel Lacanienta's resume.

RESUME INFORMATION:
${resume.text}

INSTRUCTIONS:
- Answer the question using ONLY the information from the resume above
- Be concise and direct
- If the information is not in the resume, say "I don't have that information in Miguel's resume."

QUESTION: ${question}

ANSWER:`;

    console.log("Calling Google Gemini API...");

    // Call Google Gemini API (using v1beta with gemini-1.5-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
          }
        })
      }
    );

    console.log("Gemini response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      
      return NextResponse.json({
        answer: `Error: Unable to get response from AI (${response.status}). Please check your API key.`
      });
    }

    const result = await response.json();
    console.log("Gemini response:", JSON.stringify(result, null, 2));

    // Extract answer from Gemini response format
    let answer = "No answer available.";
    
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      answer = result.candidates[0].content.parts[0].text.trim();
    }

    // If empty or too short, provide fallback
    if (!answer || answer.length < 5 || answer === "No answer available.") {
      answer = "I couldn't find an answer to that question in Miguel's resume. Try asking about his skills, education, projects, or certifications.";
    }

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      answer: `Sorry, an error occurred: ${error.message}. Please try again.`
    });
  }
}
