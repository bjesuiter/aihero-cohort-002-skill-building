import { tool } from "ai";
import z from "zod";
import {
    deleteMemory,
    generateId,
    loadMemories,
    saveMemories,
    updateMemory,
} from "../api/memory-persistence.ts";

const manageMemoriesTool = tool({
    name: `manageMemory`,
    description:
        `A tool to create, update and delete facts about the user to enrich the conversation with helpful context about the user.`,
    inputSchema: z.object({
        // Added: Define the schema for the updates. Updates should
        // be an array of objects with the following fields:
        // - id: The ID of the existing memory to update
        // - memory: The updated memory content
        updates: z.array(
            z.object({
                id: z.string().describe("The memory ID to update"),
                memory: z.string().describe("The updated memory content"),
            }),
        ).describe(
            `An array of memory objects to be updated in the users personal memory storage`,
        ),
        // Added: Define the schema for the deletions. Deletions should
        // be an array of strings, each representing the ID of a memory
        // to delete
        deletions: z.array(
            z.string().describe("An id of a memory to be deleted"),
        )
            .describe(
                `An array of memory object id strings to delete from the users personal memory storage`,
            ),
        // Added: Define the schema for the additions. Additions should
        // be an array of strings, each representing a new memory to add
        additions: z.array(
            z.string().describe("A memory to be added"),
        )
            .describe(
                `An array of new memory strings to be added to the users personal memory storage`,
            ),
    }),
    execute: async ({ additions, updates, deletions }) => {
        console.log("Updates", updates);
        console.log("Deletions", deletions);
        console.log("Additions", additions);

        // TODO: Can I find a way to not load the memories in this tool again but pass it from the outside?
        // They have to be loaded already anyways to inject them into the llm context.
        const currentMemories = loadMemories();

        // Only delete memories that are not being updated
        deletions.filter(
            (deletion) => !updates.some((update) => update.id === deletion),
        ).forEach((memoryId) => {
            deleteMemory(memoryId);
        });

        // Update the memories that need to be updated
        // by calling updateMemory for each update
        updates.forEach((update) => {
            const oldMemory = currentMemories.find((memory) =>
                update.id === memory.id
            );
            if (!oldMemory) {
                console.error(`Memory to update not found!`, update);
                return;
            }
            updateMemory(update.id, {
                ...oldMemory,
                memory: update.memory,
            });
        });

        // Save the new memories by calling saveMemories
        // with the new memories
        saveMemories(additions.map((addition) => ({
            id: generateId(),
            memory: addition,
            createdAt: new Date().toISOString(),
        })));
    },
});
