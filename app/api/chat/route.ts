import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ answer: "ERROR: No question provided" });
    }

    // Check if HF_TOKEN exists
    if (!process.env.HF_TOKEN) {
      return NextResponse.json({ 
        answer: "ERROR: HF_TOKEN not set in environment variables. Please add it in Vercel Settings → Environment Variables." 
      });
    }

    // Import résumé text
    let resume;
    try {
      resume = await import("@/lib/resume").then(m => m.default);
      
      // Debug: Check if resume loaded
      if (!resume || !resume.text) {
        return NextResponse.json({ 
          answer: "ERROR: Resume data not found or invalid. Check lib/resume.ts" 
        });
      }
    } catch (err: any) {
      return NextResponse.json({ 
        answer: `ERROR: Failed to load resume: ${err.message}` 
      });
    }

    // Build prompt
    const prompt = `Answer this question about Miguel's resume: ${question}

Resume:
${resume.text}

Answer briefly and only use information from the resume above.`;

    console.log("=== DEBUG INFO ===");
    console.log("Question:", question);
    console.log("HF_TOKEN exists:", !!process.env.HF_TOKEN);
    console.log("Resume text length:", resume.text?.length);
    console.log("Calling HuggingFace...");

    // Call HuggingFace with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
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
              max_new_tokens: 200,
              temperature: 0.7,
              return_full_text: false
            }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log("HF Response status:", response.status);
      
      const responseText = await response.text();
      console.log("HF Response text:", responseText);

      if (!response.ok) {
        if (response.status === 503) {
          return NextResponse.json({
            answer: "The AI model is currently loading. This can take 20-30 seconds. Please try again in a moment."
          });
        }
        
        return NextResponse.json({
          answer: `ERROR: HuggingFace API returned ${response.status}. Response: ${responseText}`
        });
      }

      // Parse response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        return NextResponse.json({
          answer: `ERROR: Could not parse HuggingFace response. Raw response: ${responseText}`
        });
      }

      console.log("Parsed result:", JSON.stringify(result, null, 2));

      // Extract answer
      let answer = "No answer available.";
      
      if (Array.isArray(result) && result.length > 0) {
        answer = result[0]?.generated_text || answer;
      } else if (result?.generated_text) {
        answer = result.generated_text;
      } else if (result?.[0]?.generated_text) {
        answer = result[0].generated_text;
      }

      console.log("Final answer:", answer);

      return NextResponse.json({ answer });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          answer: "ERROR: Request timed out after 30 seconds. The model might be loading."
        });
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error("=== CHAT API ERROR ===");
    console.error(error);
    return NextResponse.json({
      answer: `ERROR: ${error.message}. Check Vercel logs for details.`
    });
  }
}
