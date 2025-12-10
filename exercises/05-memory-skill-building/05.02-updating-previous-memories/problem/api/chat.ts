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
import {
  type DB,
  deleteMemory,
  loadMemories,
  saveMemories,
  updateMemory,
} from "./memory-persistence.ts";

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

  const memories = loadMemories();

  const memoriesText = memories.map(formatMemory).join("\n\n");
  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
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

      // PERSONAL NOTE: For a custom AI System I'd want explicit knowledge saving the most time,
      // except when the user brings up some key information, like Job history, Girlfriend or mariage, Kids or Life goals.
      // Make sure to categorize the "hardness" of the information:
      // A job change is a hard fact that gets recorded once and never changes in the future.
      // A Life Goal is more of a "plan" with different levels of certainty (User is thinking of, user is determined to, etc.)
      const memoriesResult = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: z.object({
          // Added: Define the schema for the updates. Updates should
          // be an array of objects with the following fields:
          // - id: The ID of the existing memory to update
          // - memory: The updated memory content
          updates: z.array(
            z.object({
              id: z.string().describe("The memory ID to update"),
              memory: z.string().describe("The updated memory content"),
            }),
          ),
          // Added: Define the schema for the deletions. Deletions should
          // be an array of strings, each representing the ID of a memory
          // to delete
          deletions: z.array(
            z.string().describe("An id of a memory to be deleted"),
          ),
          // Added: Define the schema for the additions. Additions should
          // be an array of strings, each representing a new memory to add
          additions: z.array(
            z.string().describe("A memory to be added"),
          ),
        }),
        // Added: Update the system prompt to tell it to return updates,
        // deletions and additions
        system:
          `You are a memory extraction agent. Your task is to analyze the conversation history and extract permanent memories about the user.

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

        If no memory must be added return an empty array for the "additions" property. 
        If no memory must be updated return an empty array for the "updates" property. 
        If no memory must be deleted return an empty array for the "deletions" property. 

        Make sure to NEVER have the same memory id in "deletions" and "updates", decide if it should be updated or deleted!
        
        EXISTING MEMORIES (NEVER USE THEM IN THE "additions" PROPERTY OF YOUR RESPONSE!)
        <existing-memories>
        ${memoriesText}
        </existing-memories>
        `,
        messages: convertToModelMessages(allMessages),
      });

      const { updates, deletions, additions } = memoriesResult.object;

      console.log("Updates", updates);
      console.log("Deletions", deletions);
      console.log("Additions", additions);

      // Only delete memories that are not being updated
      const filteredDeletions = deletions.filter(
        (deletion) => !updates.some((update) => update.id === deletion),
      );

      // Added: Update the memories that need to be updated
      // by calling updateMemory for each update
      for (const update of updates) {
        const oldMemory = memories.find((memory) => update.id === memory.id);
        if (!oldMemory) {
          console.log(`Memory to update not found!`, update);
          continue;
        }
        updateMemory(update.id, {
          ...oldMemory,
          memory: update.memory,
        });
      }

      // Added: Delete the memories that need to be deleted
      // by calling deleteMemory for each filtered deletion
      for (const deletion of deletions) {
        deleteMemory(deletion);
      }

      // Added: Save the new memories by calling saveMemories
      // with the new memories
      saveMemories(additions.map((addition) => ({
        id: generateId(),
        memory: addition,
        createdAt: new Date().toISOString(),
      })));
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
