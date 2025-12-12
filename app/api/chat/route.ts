import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ answer: "Please ask a question about Miguel's resume." });
    }

    // Import résumé
    const resume = await import("@/lib/resume").then(m => m.default);
    
    if (!resume || !resume.text) {
      return NextResponse.json({ answer: "Resume data not found." });
    }

    const questionLower = question.toLowerCase();
    const resumeText = resume.text;

    // Define Q&A patterns
    const answers: { [key: string]: string } = {
      // Education
      "study|education|school|university|college": 
        "Miguel studied B.S. Computer Science (AI Track) at Mapúa University from SY 2021-2025. He also completed multiple online courses in data science, machine learning, AI, and Python.",
      
      // Certifications - Microsoft
      "microsoft cert|azure cert|power platform cert":
        "Miguel has several Microsoft certifications: Azure AI Fundamentals (2024), Azure AI Engineer Associate (2024), Azure Administrator Associate (2025), and Power Platform Fundamentals (2024).",
      
      // Certifications - All
      "certification|certified|cert":
        "Miguel has many certifications including: Microsoft Azure AI Fundamentals (2024), Azure AI Engineer Associate (2024), Azure Administrator Associate (2025), Power Platform Fundamentals (2024), multiple Oracle Cloud certifications (2021-2024), Neo4j certifications (2025), PCEP Python (2019), and JSE JavaScript (2023).",
      
      // Skills - Programming
      "programming|language|code":
        "Miguel's programming skills include Python, JavaScript, and AI/Machine Learning.",
      
      // Skills - Cloud
      "cloud|azure|oracle":
        "Miguel has experience with Microsoft Azure and Oracle Cloud Infrastructure.",
      
      // Skills - Power Platform
      "power platform|power automate|power apps":
        "Miguel has skills in Microsoft Power Automate, Microsoft Power Apps, and Dataverse.",
      
      // Skills - All
      "skill|technology|tech stack":
        "Miguel's skills include: Power Platform (Power Automate, Power Apps, Dataverse), Programming (Python, JavaScript, AI), and Cloud (Microsoft Azure, Oracle Cloud Infrastructure).",
      
      // Projects - PPE
      "ppe|cctv|yolo|computer vision":
        "Miguel built a PPE CCTV Detection System using YOLOv9 for Personal Protective Equipment detection with real-time CCTV monitoring.",
      
      // Projects - Chrome Extension
      "chrome|extension|ollopa|selenium":
        "Miguel created the Ollopa Chrome Extension for automation and web scraping using Selenium, Flask, and Python.",
      
      // Projects - Food Prices
      "food|price|arima|predict":
        "Miguel developed a Predictive Analysis system for Food Prices using ARIMA (AutoRegressive Integrated Moving Average) for time series forecasting.",
      
      // Projects - LangChain
      "langchain|mistral|gpt|llm":
        "Miguel built two LangChain applications: (1) LangChain Mistral-7B Application integrating the Mistral-7B model, and (2) LangChain Auto-GPT Application for autonomous AI task automation.",
      
      // Projects - All
      "project":
        "Miguel's projects include: (1) PPE CCTV Detection System using YOLOv9, (2) Ollopa Chrome Extension with Selenium/Flask, (3) Predictive Analysis for Food Prices using ARIMA, (4) LangChain Mistral-7B app, and (5) LangChain Auto-GPT app.",
      
      // Contact
      "contact|email|phone|location|address|reach":
        "Miguel can be reached at: Email: mmlacanienta@gmail.com, Phone: +63 (917) 811 2386, Location: Tower A - 1819 Jazz Residences, Makati, LinkedIn: linkedin.com/in/miguel-lacanienta/",
      
      // Experience
      "experience|work|job":
        "Miguel's objective is Programming or DevOps using Power Platform, Python, JavaScript, and cloud technologies such as Azure and Oracle Cloud Infrastructure.",
      
      // Summary/About
      "about|who|summary":
        "Miguel Lacanienta is a B.S. Computer Science student (AI Track) at Mapúa University with extensive certifications in Microsoft Azure, Oracle Cloud, and programming. He has hands-on experience with Power Platform, Python, JavaScript, and has built several AI/ML projects including YOLOv9 computer vision and LangChain applications."
    };

    // Find matching answer
    let answer = "";
    
    for (const [pattern, response] of Object.entries(answers)) {
      const keywords = pattern.split("|");
      if (keywords.some(keyword => questionLower.includes(keyword))) {
        answer = response;
        break;
      }
    }

    // If no pattern matches, do a simple text search
    if (!answer) {
      // Extract relevant sentences from resume
      const sentences = resumeText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const matchingSentences = sentences.filter(sentence => {
        const words = questionLower.split(/\s+/).filter(w => w.length > 3);
        return words.some(word => sentence.toLowerCase().includes(word));
      });

      if (matchingSentences.length > 0) {
        answer = matchingSentences.slice(0, 3).join(". ") + ".";
      } else {
        answer = "I couldn't find specific information about that in Miguel's resume. Try asking about his education, certifications, skills, projects, or contact information.";
      }
    }

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({
      answer: "Sorry, there was an error. Please try again."
    });
  }
}
