import { NextResponse } from "next/server";
import resume from "../../../lib/resume";

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function chunk(text: string, size = 250, overlap = 30) {
  const words = text.split(/\s+/);
  const result = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    result.push(words.slice(i, i + size).join(" "));
  }
  return result;
}

function score(query: string, chunk: string) {
  const q = new Set(normalize(query).split(" "));
  const c = new Set(normalize(chunk).split(" "));
  let count = 0;
  q.forEach((w) => c.has(w) && count++);
  return count;
}

export async function POST(req: Request) {
  const { question } = await req.json();
  if (!question) return NextResponse.json({ answer: "Please provide a question." });

  const chunks = chunk(resume.text);
  const ranked = chunks
    .map((c) => ({ c, s: score(question, c) }))
    .sort((a, b) => b.s - a.s);

  if (ranked[0].s === 0) {
    return NextResponse.json({
      answer:
        "No exact keyword match found. Here's a general summary:\n\n" +
        resume.summary
    });
  }
  
  // Extract only the most relevant sentences
  function extractRelevantLines(text: string, query: string) {
    const sentences = text.split(/[\.\n]+/);
    const q = normalize(query).split(" ");
    let best = "";
    let bestScore = 0;
  
    for (const s of sentences) {
      const sNorm = normalize(s);
      let score = 0;
      q.forEach((w) => sNorm.includes(w) && score++);
      if (score > bestScore) {
        bestScore = score;
        best = s.trim();
      }
    }
  
    return best || text.trim();
  }
  
  const top = ranked[0].c;
  const answer = extractRelevantLines(top, question);
  
  return NextResponse.json({ answer });
  
}

