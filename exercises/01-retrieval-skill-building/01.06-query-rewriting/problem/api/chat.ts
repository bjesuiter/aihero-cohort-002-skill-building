import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { searchEmails } from "./search.ts";

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // TODO: Change the generateObject call so that it generates a search query in
      // addition to the keywords. This will be used for semantic search, which will be a
      // big improvement over passing the entire conversation history.
      const keywords = await generateObject({
        model: google("gemini-2.5-flash"),
        system:
          `You are a helpful email assistant, able to search emails for information.
          Your job is to generate a list of keywords to search the emails via bm25 and a 
          searchTerm which will be used for semantic search via embeddings. 
          The keywords should be single word keywords, except when descripting one thing, like "E-Mail", then use dashes to connect the words.  
          The search string should capture the semantic meaning of the input text in one sentence. 
          Focus on the last message and use context from the previous ones if needed. 
        `,
        schema: z.object({
          keywords: z
            .array(z.string())
            .describe(
              "A list of keywords to search the emails with. Use these for exact terminology.",
            ),
          searchTerm: z.string().describe(
            "A string to search for via semantic search with embeddings. ",
          ),
        }),
        messages: convertToModelMessages(messages),
      });

      console.dir(keywords.object, { depth: null });

      const searchResults = await searchEmails({
        keywordsForBM25: keywords.object.keywords,
        embeddingsQuery: keywords.object.searchTerm,
      });

      const topSearchResults = searchResults.slice(0, 5);

      console.log(
        topSearchResults.map((result) => result.email.id),
      );

      const emailSnippets = [
        "## Email Snippets",
        ...topSearchResults.map((result, i) => {
          const from = result.email?.from || "unknown";
          const to = result.email?.to || "unknown";
          const subject = result.email?.subject || `email-${i + 1}`;
          const body = result.email?.body || "";

          return [
            `### 📧 Email ${i + 1}: [${subject}](#${
              subject.replace(/[^a-zA-Z0-9]/g, "-")
            })`,
            `**From:** ${from}`,
            `**To:** ${to}`,
            body,
            "---",
          ].join("\n\n");
        }),
        "## Instructions",
        "Based on the emails above, please answer the user's question. Always cite your sources using the email subject in markdown format.",
      ].join("\n\n");

      const answer = streamText({
        model: google("gemini-2.5-flash"),
        system:
          `You are a helpful email assistant that answers questions based on email content.
          You should use the provided emails to answer questions accurately.
          ALWAYS cite sources using markdown formatting with the email subject as the source.
          Be concise but thorough in your explanations.
        `,
        messages: [
          ...convertToModelMessages(messages),
          {
            role: "user",
            content: emailSnippets,
          },
        ],
      });

      writer.merge(answer.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
