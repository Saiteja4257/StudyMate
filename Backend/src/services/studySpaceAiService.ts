import groq from "../config/groq";

export const generateCourseCurriculum = async (topic: string, goal: string) => {
  const prompt = `You are an expert curriculum designer. Design a comprehensive study course.
  
Topic: ${topic}
User Goal: ${goal}

Create a well-structured course with 8-15 modules depending on the topic's complexity.
Return ONLY a valid JSON object matching this schema:
{
  "title": "A catchy, descriptive title for the course",
  "description": "A 2-3 sentence overview of what the course covers and its benefits",
  "modules": [
    {
      "title": "Module Title (e.g., Introduction to X)",
      "order": 1,
      "summary": "Brief 1-sentence summary of the module's focus"
    }
  ]
}

Rules:
- Order must be sequential starting from 1.
- Output ONLY the JSON object, no markdown wrappers like \`\`\`json, no other text.
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are an expert curriculum designer. Output ONLY valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  return completion.choices[0].message.content;
};

export const generateModuleContent = async (courseTitle: string, topic: string, moduleTitle: string) => {
  const prompt = `You are an expert tutor creating detailed content for a specific module in a course.

Course: ${courseTitle} (Topic: ${topic})
Current Module: ${moduleTitle}

Generate the full educational content for this module.
Return ONLY a valid JSON object matching this schema:
{
  "summary": "A 1-2 paragraph overview of what will be learned in this module.",
  "detailedNotes": "Comprehensive, detailed study notes covering the module's topic. Use markdown formatting (headings, bullet points, bold text). Make it thorough but easy to read.",
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4", "Concept 5"],
  "flashcards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ],
  "quizzes": [
    {
      "question": "Clear multiple choice question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option B",
      "explanation": "Brief explanation of why this is correct."
    }
  ],
  "visualTopics": {
    "title": "Main concept visualization",
    "explanation": "Text explanation of the diagram",
    "diagramType": "Flowchart or Tree",
    "nodes": [
      { "id": "1", "data": { "label": "Main Concept" }, "position": { "x": 250, "y": 0 }, "type": "default" }
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2", "type": "smoothstep" }
    ]
  }
}

Rules:
- Provide 5-10 key concepts.
- Provide 5-10 flashcards.
- Provide exactly 5 quiz questions. The "answer" must exactly match one of the "options".
- For "visualTopics", provide a sensible React Flow graph representation (nodes with x,y coords and edges connecting them). Keep nodes spaced out.
- Output ONLY the JSON object, no markdown wrappers like \`\`\`json, no other text.
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are an expert tutor and study material generator. Output ONLY valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 8000,
  });

  return completion.choices[0].message.content;
};

export const askStudySpaceTutor = async (
  context: string,
  question: string,
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
) => {
  const historyMessages = chatHistory.slice(-10).map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));
  
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are the AI Tutor for a specific Study Space module. 
Your primary goal is to help the user understand the material provided in the context below.

MODULE CONTEXT:
\${context}

RULES:
1. Prioritize the module context when answering. If the answer is in the context, use it and explain it clearly.
2. If the user asks something related to the topic but NOT in the context, you can use your general knowledge, but mention that it goes beyond the current module.
3. Be encouraging, concise, and use markdown formatting for readability.
4. If it's a general greeting, just reply naturally without mentioning the context.`,
      },
      ...historyMessages,
      {
        role: "user",
        content: question,
      },
    ],
    temperature: 0.2,
  });

  return completion.choices[0].message.content;
};
