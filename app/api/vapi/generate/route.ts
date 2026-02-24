import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();

  // Extracting the flattened variables
  // Vapi wraps the body payload in a specific structure depending on the request type
  const { type, role, level, techstack, amount, userid } =
    body.message?.call?.parsed || body;

  try {
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted strictly as a JSON array of strings like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    // Strip out markdown code blocks just in case the LLM includes them
    const cleanJsonString = questions.replace(/```json\n?|```/g, '').trim();

    const interview = {
      role: role || "Unknown",
      type: type || "General",
      level: level || "Entry",
      techstack: techstack ? techstack.split(",") : [],
      questions: JSON.parse(cleanJsonString),
      userId: userid || "anonymous-user", // Fallback if Vapi doesn't send it
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}