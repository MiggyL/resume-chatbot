import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import resume from '@/lib/resume';

// Password protect this endpoint
const INDEXING_SECRET = process.env.INDEXING_SECRET || 'change-this-secret';

export async function GET(request: Request) {
  // Check secret parameter
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== INDEXING_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('🚀 Starting resume indexing...');
    
    // Expanded resume content
    const resumeContent = `
# Miguel Lacanienta

## Objective
Programming or DevOps using Power Platform, Python, JavaScript, and cloud technologies such as Azure and Oracle Cloud Infrastructure.

## Contact Information
- Location: Tower A - 1819 Jazz Residences, Makati
- Phone: +63 (917) 811 2386
- Email: mmlacanienta@gmail.com
- LinkedIn: linkedin.com/in/miguel-lacanienta/

## Skills

### Power Platform
- Microsoft Power Automate
- Microsoft Power Apps
- Dataverse

### Programming
- Python
- JavaScript
- AI/Machine Learning

### Cloud Technologies
- Microsoft Azure
- Oracle Cloud Infrastructure

## Certifications

### Microsoft Certifications
- Azure AI Fundamentals (2024)
- Azure AI Engineer Associate (2024)
- Azure Administrator Associate (2025)
- Power Platform Fundamentals (2024)

### Oracle Cloud Certifications
- Multiple Oracle Cloud certifications (2021-2024)

### Other Certifications
- Neo4j certifications (2025)
- PCEP - Certified Entry-Level Python Programmer (2019)
- JSE - JavaScript Entry-Level Certification (2023)

## Education

### B.S. Computer Science, AI Track
Mapúa University | SY 2021-2025
- Specialized in Artificial Intelligence track
- Completed multiple online courses in data science, machine learning, and AI
- Advanced Python programming courses

## Projects

### PPE CCTV Detection System
- Computer vision project using YOLOv9 for Personal Protective Equipment detection
- Real-time monitoring through CCTV integration
- Technologies: YOLOv9, Computer Vision, Python

### Ollopa Chrome Extension
- Browser extension for automation and web scraping
- Technologies: Selenium, Flask, Python, Chrome Extension APIs
- Automated workflow management

### Predictive Analysis for Food Prices
- Time series forecasting model for food price prediction
- Technologies: ARIMA (AutoRegressive Integrated Moving Average), Python
- Data analysis and statistical modeling

### LangChain Mistral-7B Application
- Large Language Model application using LangChain framework
- Integration with Mistral-7B model
- Technologies: LangChain, Mistral-7B, Python

### LangChain Auto-GPT Application
- Autonomous AI agent application using LangChain
- Auto-GPT implementation for task automation
- Technologies: LangChain, Auto-GPT, Python, AI agents

## Technical Expertise

### Cloud & DevOps
- Microsoft Azure services and administration
- Oracle Cloud Infrastructure deployment and management
- Cloud architecture and best practices

### AI & Machine Learning
- Computer Vision (YOLO models)
- Natural Language Processing (LangChain, LLMs)
- Time Series Analysis (ARIMA)
- AI agent development

### Automation & Integration
- Power Platform workflow automation
- Web scraping and automation (Selenium)
- API development (Flask)
- Browser extension development
`;

    // Chunk the text
    const chunks = chunkText(resumeContent);
    console.log(`📄 Created ${chunks.length} chunks`);

    // Generate embeddings
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const embeddings = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🤖 Processing chunk ${i + 1}/${chunks.length}`);
      
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Create a brief semantic summary of this resume section in 2-3 sentences:\n\n${chunks[i]}`
        }]
      });
      
      const summary = message.content[0].type === 'text' ? message.content[0].text : '';
      
      embeddings.push({
        id: i.toString(),
        text: chunks[i],
        summary: summary,
        metadata: {
          chunk_index: i,
          total_chunks: chunks.length
        }
      });
    }

    console.log('✨ Indexing complete!');

    // Return the embeddings as JSON (you'll need to save this manually)
    return NextResponse.json({
      success: true,
      message: 'Resume indexed successfully! Copy the embeddings below and save to data/resume_chunks.json',
      embeddings: embeddings,
      instructions: [
        '1. Copy the "embeddings" array from this response',
        '2. Create a file: data/resume_chunks.json',
        '3. Paste the embeddings array as the file content',
        '4. Commit to GitHub',
        '5. Delete this endpoint file for security'
      ]
    });

  } catch (error: any) {
    console.error('Indexing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function chunkText(text: string, chunkSize: number = 500): string[] {
  const sections = text.split('\n## ').filter(s => s.trim());
  const chunks: string[] = [];
  
  sections.forEach(section => {
    if (section.length <= chunkSize) {
      chunks.push('## ' + section);
    } else {
      const subsections = section.split('\n### ');
      
      if (subsections.length > 1) {
        chunks.push('## ' + subsections[0].trim());
        subsections.slice(1).forEach(sub => {
          chunks.push('### ' + sub.trim());
        });
      } else {
        const paragraphs = section.split('\n\n');
        let currentChunk = '';
        
        paragraphs.forEach(para => {
          if ((currentChunk + para).length <= chunkSize) {
            currentChunk += para + '\n\n';
          } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = para + '\n\n';
          }
        });
        
        if (currentChunk) chunks.push(currentChunk.trim());
      }
    }
  });
  
  return chunks;
}