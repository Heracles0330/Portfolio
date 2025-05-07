// app/api/chat/route.ts
import { personalData } from "@/utils/data/personal-data";
import { educations } from "@/utils/data/educations";
import { experiences } from "@/utils/data/experience";
import { skillsData } from "@/utils/data/skills";
import { projectsData } from "@/utils/data/projects-data";
import { NextRequest, NextResponse } from "next/server";

// Prepare system prompt with all your personal data
const buildSystemPrompt = () => {
    return `You are Heracles' personal AI assistant, with access to the following information:

PERSONAL:
Name: ${personalData.name}
Current role: ${personalData.designation}
Location: ${personalData.address}
Email: ${personalData.email}
Phone: ${personalData.phone}
GitHub: ${personalData.github}
GitHub username: ${personalData.devUsername}
Description: ${personalData.description}

EDUCATION:
${educations
    .map((edu) => `- ${edu.title} at ${edu.institution} (${edu.duration})`)
    .join("\n")}

WORK EXPERIENCE:
${experiences
    .map((exp) => `- ${exp.title} at ${exp.company} ${exp.duration}`)
    .join("\n")}

SKILLS:
${skillsData.join(", ")}

PROJECTS:
${projectsData
    .map(
        (project) =>
            `${project.name} (${project.role})
   - Technologies: ${project.tools.join(", ")}
   - Description: ${project.description}`
    )
    .join("\n\n")}

INSTRUCTIONS:
1. Only answer questions about Heracles based on the information provided above.
2. If asked about information not included here, politely explain you don't have that information.
3. Be friendly and professional in your responses.
4. Keep responses concise and accurate.
5. For technical questions unrelated to Heracles' background, kindly redirect to discussing his skills and experience.
6. You may use markdown formatting in your responses.
`;
};

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: buildSystemPrompt() },
                        { role: "user", content: message },
                    ],
                    stream: true,
                }),
            }
        );

        // Create a ReadableStream from the response body
        const stream = response.body;
        const reader = stream?.getReader();
        const encoder = new TextEncoder();
        
        if (!reader) {
            throw new Error("No reader available");
        }

        // Create a new ReadableStream that processes the chunks
        const processedStream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                            break;
                        }
                        
                        // Convert the chunk to text
                        const chunkText = new TextDecoder().decode(value);
                        
                        // Process each line (each JSON object)
                        const lines = chunkText.split('\n').filter(line => line.trim() !== '');
                        
                        for (const line of lines) {
                            try {
                                // Each line should be a JSON object with "data: " prefix
                                if (line.startsWith('data: ')) {
                                    const jsonText = line.substring(6); // Remove "data: "
                                    if (jsonText === '[DONE]') {
                                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                                        continue;
                                    }
                                    
                                    const json = JSON.parse(jsonText);
                                    const content = json.choices[0]?.delta?.content || '';
                                    if (content) {
                                        controller.enqueue(encoder.encode(`data: ${content}\n\n`));
                                    }
                                }
                            } catch (e) {
                                console.error('Error processing line:', line, e);
                            }
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error("Stream processing error:", error);
                    controller.error(error);
                }
            }
        });

        return new NextResponse(processedStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
            { error: error.message || "An error occurred" },
            { status: 500 }
        );
    }
}
