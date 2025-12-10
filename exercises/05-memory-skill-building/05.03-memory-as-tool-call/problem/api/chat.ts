import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  type DB,
  deleteMemory,
  loadMemories,
  saveMemories,
  updateMemory,
} from "./memory-persistence.ts";
import { manageMemoriesTool } from "../../../05.02-updating-previous-memories/problem/lib/manage-memories.tool.ts";

export type MyMessage = UIMessage<unknown, {}>;

const formatMemory = (memory: DB.MemoryItem) => {
  return [
    `Memory: ${memory.memory}`,
    `ID: ${memory.id}`,
    `Created At: ${memory.createdAt}`,
  ].join("\n");
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const memories = await loadMemories();

  const memoriesText = memories.map(formatMemory).join("\n\n");

  const result = streamText({
    model: google("gemini-2.5-flash-lite"),
    system:
      `You are a helpful assistant that can answer questions and help with tasks.

    The date is ${new Date().toISOString().split("T")[0]}.

    You have access to the following memories:

    <memories>
    ${memoriesText}
    </memories>

    When users share new personal information, contradict previous information, or ask you to remember/forget things, 
    use the manageMemories tool to update the memory system with permanent memories.

    <memory-tool-instructions>
    PERMANENT MEMORIES are facts about the user that:
    - Are unlikely to change over time (preferences, traits, characteristics)
    - Will remain relevant for weeks, months, or years
    - Include personal details, preferences, habits, or important information shared
    - Are NOT temporary or situational information

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
    Return them as an array in the "additions" property of your reponse. 

    Memories can also be updated. If you find a memory in the conversation that changed, 
    take it's id and generate an updated memory. 
    More markers for "changed" or "updated" memories include: 
    - User preferences change
    - New information contradicts old information
    - Clarifications are provided
    Return both as an entry in the "updates" property in the response object. 

    Lastly, memories could go stale. Markers for that are: 
    - Information is outdated
    - Information is incorrect
    - Information is no longer relevant
    You can delete them in this case 
    by listing their memory id in the "deletions" property of the response object. 

    +Each memory should be a concise, factual statement about the user.
    +Batching multiple conversation turns is permitted.

    More Rules
    - If no memory must be added return an empty array for the "additions" property. 
    - If no memory must be updated return an empty array for the "updates" property. 
    - If no memory must be deleted return an empty array for the "deletions" property. 
    - Make sure to NEVER have the same memory id in "deletions" and "updates", 
      decide if it should be updated or deleted!
    - NEVER USE EXISTING MEMORIES IN THE "additions" PROPERTY OF THE MEMORY TOOL PARAMETER OBJECT!
    </memory-tool-instructions>
    `,
    messages: convertToModelMessages(messages),
    // Added: Add the manageMemories tool
    // The tool should have three parameters:
    // - updates: array of objects with { id: string, memory: string }
    // - deletions: array of strings (memory IDs to delete)
    // - additions: array of strings (new memories to add)
    // In the execute function, perform the actual memory operations
    tools: {
      manageMemories: manageMemoriesTool,
    },
    // Added: Add stopWhen with stepCountIs to allow the agent to call tools
    // Use stepCountIs(5) to allow up to 5 generation steps
    stopWhen: stepCountIs(5),
  });

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  });
};
