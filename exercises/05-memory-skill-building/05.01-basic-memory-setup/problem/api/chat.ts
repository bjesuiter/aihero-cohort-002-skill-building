import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { type DB, loadMemories, saveMemories } from "./memory-persistence.ts";

export type MyMessage = UIMessage<unknown, {}>;

const formatMemory = (memory: DB.MemoryItem) => {
  return [
    `Memory: ${memory.memory}`,
    `Created At: ${memory.createdAt}`,
  ].join("\n");
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  // ADDED
  const memories = loadMemories();

  // ADDED
  const memoriesText = memories.map(formatMemory).join("\n\n");

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      // QUESTION: Isn't adding the memories to the system prompt a huuuuge security risk, since the memories are basically generated from user input?
      // Matt: Yes, Memories should be included as user messages, not in the system prompt.
      // TODO: Task for myself: Figure out how to add the memories to the user prompt in a nice way!
      // Probably the same technique as used in "Prompt Rewriting" in ai-sdk crash-course!
      const result = streamText({
        model: google("gemini-2.5-flash-lite"),
        system:
          `You are a helpful assistant that can answer questions and help with tasks.

        The date is ${new Date().toISOString().split("T")[0]}.

        You have access to the following memories:

        <memories>
        ${memoriesText}
        </memories>
        `,
        messages: convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async (response) => {
      const allMessages = [...messages, ...response.messages];

      // TODO: Generate the memories using the generateObject function
      // Pass it the entire message history and the existing memories
      // Write a system prompt that tells the LLM to only focus on permanent memories
      // and not temporary or situational information
      // Note: I kept my attempt at the prompt, the solution promt is better and also adjusted to not produce duplicates!
      const memoriesResult = await generateObject({
        model: google("gemini-2.5-flash-lite"),
        schema: z.object({
          memories: z.array(z.string()),
        }),
        system: `You are a memory extraction agent. 
        Your task is to analyze the conversation history and extract permanent memories about the user.
        Make sure to not include temporary or situational information.

        EXAMPLES OF PERMANENT MEMORIES:
        - "User prefers dark mode interfaces"
        - "User works as a software engineer"
        - "User has a dog named Max"
        - "User is learning TypeScript"
        - "User prefers concise explanations"
        - "User lives in San Francisco"

        EXAMPLES OF WHAT NOT TO MEMORIZE:
        - "User asked about weather today" (temporary)
        - "User is currently debugging code" (situational)
        - "User said hello" (trivial interaction)

        Extract any new permanent memories from this conversation. 
        Return an array of memory strings that should be added to the user's permanent memory. 
        Each memory should be a concise, factual statement about the user.

        EXISTING MEMORIES:
        ${memoriesText}

        If no new permanent memories are found, return an empty array.
        `,
        messages: convertToModelMessages(allMessages),
      });

      const newMemories = memoriesResult.object.memories;
      console.log("newMemories", newMemories);

      saveMemories(
        newMemories.map((memory) => ({
          id: generateId(),
          memory,
          createdAt: new Date().toISOString(),
        })),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
