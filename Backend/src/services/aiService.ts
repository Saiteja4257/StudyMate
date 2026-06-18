import groq from "../config/groq";

export const generateSummary = async (text: string) => {
  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3-32b", 
    messages: [
      {
        role: "system",
        content:
          "You are a study assistant. Create a comprehensive summary of the content. Organize the summary logically by sections with clear headings, and use concise bullet points within each section to make it easy to read and understand. Do NOT include <think> tags or your internal reasoning.",
      },
      {
        role: "user",
        content: text.slice(0, 10000),
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
};

export const generateQuiz = async (text: string, previousQuestions: string[] = []) => {
  const duplicatePrompt = previousQuestions.length > 0 
    ? `\nCRITICAL INSTRUCTION: DO NOT generate questions that are identical or highly similar to the following existing questions:\n${previousQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}\n`
    : "";

  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3-32b",
    messages: [
      {
        role: "system",
        content: `
Generate 10 multiple choice questions from the study material.${duplicatePrompt}

Return ONLY valid JSON.

Format:

[
  {
    "question": "What is an Operating System?",
    "options": [
      "A software",
      "A hardware device",
      "A network protocol",
      "A database"
    ],
    "answer": "A software"
  }
]
`,
      },
      {
        role: "user",
        content: text.slice(0, 10000),
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
};

export const generateFlashcards = async (text: string) => {
  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3-32b",
    messages: [
      {
        role: "system",
        content: `
Generate flashcards from the study material.

Return ONLY valid JSON.

Format:

[
  {
    "front": "Question",
    "back": "Answer"
  }
]
`,
      },
      {
        role: "user",
        content: text.slice(0, 10000),
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
};

export const analyzeQuizAttempt = async (questions: any[], userAnswers: string[]) => {
  const incorrect = questions.filter((q, idx) => q.answer !== userAnswers[idx]);
  
  if (incorrect.length === 0) {
    return []; // No weak topics
  }

  const promptStr = incorrect.map((q, i) => `Q: ${q.question}\nCorrect Answer: ${q.answer}\nUser Answer: ${userAnswers[questions.indexOf(q)]}`).join("\n\n");

  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3-32b",
    messages: [
      {
        role: "system",
        content: `
Analyze the following questions that a user got wrong on a quiz. 
Identify the core topics or concepts they are struggling with.
Return ONLY a valid JSON array of strings representing these topics (max 5 topics).
Example: ["Network Protocols", "Memory Management"]

Incorrect Answers:
${promptStr}
`,
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
};

export const askWithContext = async (
  context: string,
  question: string,
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
) => {
  // Build conversation messages from history
  const historyMessages = chatHistory.slice(-10).map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));
    console.log(context);
  const completion =
    await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `You are StudyMate AI — a friendly, knowledgeable study assistant chatbot.

You have TWO modes of operation:

1. **General Conversation**: For greetings (e.g. "hello", "hi", "hey"), small talk, study tips, motivation, general knowledge questions, or anything NOT specifically about the uploaded document — respond naturally and helpfully as an AI study assistant. Be friendly, encouraging, and conversational.

2. **Document Q&A (RAG)**: When the user asks a question that relates to the uploaded document content, use the provided context to give accurate, well-structured answers. Cite or reference the document content where appropriate.

RULES:
- For general conversation, DO NOT mention "the document" or say "not available in the uploaded document". Just respond naturally.
- For document-related questions, base your answer on the provided context. If the specific information is not in the context, say so clearly but also offer to help with what IS available.
- Use markdown formatting for structured answers (bullet points, headings, bold text).
- Be concise but thorough.
- Maintain a warm, supportive tone as a study companion.

DOCUMENT CONTEXT (use this for document-related questions):
${context}`,
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

export const generateMindMap = async (text: string) => {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `Create a mind map from the study material. Return ONLY valid JSON, no explanation.

Format: {"nodes":[{"id":"1","label":"Topic","type":"central"},{"id":"2","label":"Sub","type":"branch"},{"id":"3","label":"Detail","type":"leaf"}],"edges":[{"from":"1","to":"2"},{"from":"2","to":"3"}]}

Rules:
- Exactly ONE "central" node (main topic).
- "branch" for major sections, "leaf" for details.
- 12-20 nodes total. Labels: 2-5 words max.
- Every node connected by at least one edge (from parent to child).
- Return ONLY valid JSON, nothing else.`,
      },
      {
        role: "user",
        content: text.slice(0, 8000),
      },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  return completion.choices[0].message.content;
};

export const generateStudySchedule = async (
  examDate: Date,
  availableHoursPerDay: number,
  subjects: string[],
  weakTopics: string[],
  allTopics: string[]
) => {
  const prompt = `Create a personalized study plan. Return ONLY valid JSON, no explanation.

Exam Date: ${examDate.toISOString()}
Available Hours/Day: ${availableHoursPerDay}
Core Subjects to Study: ${subjects.join(', ')}
Weak Topics to Prioritize: ${weakTopics.join(', ')}
Available Sub-Topics for these subjects: ${allTopics.join(', ')}

Format requirements: Return an array of tasks.
[
  {
    "id": "unique-task-id",
    "date": "YYYY-MM-DD",
    "title": "Study session title",
    "type": "study" | "revision" | "quiz",
    "topic": "topic name",
    "duration": 60 // in minutes
  }
]

Rules:
- Distribute tasks from today until the exam date.
- YOU MUST ONLY create tasks for the "Core Subjects to Study" and their related "Sub-Topics". Do NOT include tasks for other unrelated subjects.
- Prioritize "Weak Topics" first.
- Ensure total duration per day does not exceed (Available Hours * 60) minutes.
- Include "revision" and "quiz" sessions near the exam date.
- Return ONLY the JSON array, no markdown wrappers, no explanations.`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: "You are an expert study planner. Output only valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });

  return completion.choices[0].message.content;
};

export const generateTaskContent = async (topic: string, title: string) => {
  const prompt = `You are an expert tutor. Create a concise study guide and a short 3-question quiz to test understanding of the following topic.

Topic: ${topic}
Context/Title: ${title}

Format requirements: Return ONLY a valid JSON object matching this schema:
{
  "studyGuide": "A detailed, well-formatted Markdown string explaining the key concepts, examples, and important details of the topic.",
  "quiz": [
    {
      "question": "Clear multiple choice question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option B",
      "explanation": "Brief explanation of why this is correct."
    }
  ]
}

Rules:
- The studyGuide must use proper Markdown formatting (headings, lists, bold text).
- The quiz must have exactly 3 questions.
- The "answer" must exactly match one of the "options".
- Output ONLY the JSON object, no markdown wrappers like \`\`\`json, no other text.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
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
    temperature: 0.3,
    max_tokens: 4096,
  });

  return completion.choices[0].message.content;
};

export const generateChatTitle = async (firstMessage: string) => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that generates a concise 3-5 word title for a chat conversation based on the user's first message. Return ONLY the title string without quotes or punctuation.",
      },
      {
        role: "user",
        content: firstMessage,
      },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content?.trim() || "New Chat";
};