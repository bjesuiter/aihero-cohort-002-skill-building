import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  type ModelMessage,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import z from "zod";

export type ToolRequiringApproval = {
  id: string;
  type: "send-email";
  toolCallId: string;
  content: string;
  to: string;
  subject: string;
};

export type ToolApprovalDecision =
  | {
    type: "approve";
  }
  | {
    type: "reject";
    reason: string;
  };

export type MyMessage = UIMessage<
  unknown,
  {
    "approval-request": {
      tool: ToolRequiringApproval;
    };
    "approval-decision": {
      // The original tool ID that this decision is for.
      toolId: string;
      decision: ToolApprovalDecision;
    };
  }
>;

const annotateMessageHistory = (
  messages: MyMessage[],
): ModelMessage[] => {
  // Added: Use convertDataPart in the second parameter of convertToModelMessages
  // to allow the model to read the custom data parts.
  // Without this, the model will only see the text parts/tool calls.
  const modelMessages = convertToModelMessages<MyMessage>(messages, {
    convertDataPart: (myCustomDataPart) => {
      switch (myCustomDataPart.type) {
        case "data-approval-request":
          const approvalRequst = myCustomDataPart.data.tool;
          // Note to self: this tool call approval conversion does not need the full details of the tool call,
          // since the tool call itself already has these details. This only makes the context unnecessarily full.
          return {
            type: "text",
            text:
              `HITL approval requested for tool "${approvalRequst.type}" with data:
            approvalId: ${approvalRequst.id}
            toolCallId: ${approvalRequst.toolCallId}`,
          };

        case "data-approval-decision": {
          const approvalDecision = myCustomDataPart.data;
          let decisionText =
            `Tool use for approval id "${approvalDecision.toolId}" was ${
              approvalDecision.decision.type === "approve"
                ? "approved"
                : "rejected"
            }
          `;
          if (approvalDecision.decision.type === "reject") {
            decisionText +=
              `\nReason for rejection: ${approvalDecision.decision.reason}`;
          }
          return {
            type: "text",
            text: decisionText,
          };
        }
      }
    },
  });

  return modelMessages;
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  console.dir(messages[messages.length - 1], { depth: null });

  const annotatedMessageHistory = annotateMessageHistory(messages);
  console.log(
    `09.03: Annotated message history: `,
    JSON.stringify(annotatedMessageHistory, null, "  "),
  );

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResponse = streamText({
        model: google("gemini-2.5-flash"),
        system: `
          You are a helpful assistant that can send emails.
          You will be given a diary of the conversation so far.
          The user's name is "John Doe".
        `,
        messages: annotatedMessageHistory,
        tools: {
          sendEmail: {
            description: "Send an email",
            inputSchema: z.object({
              to: z.string(),
              subject: z.string(),
              content: z.string(),
            }),
            execute: ({ to, subject, content }, toolCallOptions) => {
              writer.write({
                type: "data-approval-request",
                data: {
                  tool: {
                    id: crypto.randomUUID(),
                    type: "send-email",
                    toolCallId: toolCallOptions.toolCallId,
                    to,
                    subject,
                    content,
                  },
                },
              });

              return "Requested to send an email";
            },
          },
        },
        stopWhen: [stepCountIs(10), hasToolCall("sendEmail")],
      });

      writer.merge(streamTextResponse.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
