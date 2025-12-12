import type {
  MyMessage,
  ToolApprovalDecision,
  ToolRequiringApproval,
} from "./chat.ts";

export type HITLError = {
  message: string;
  status: number;
};

export type HITLDecisionsToProcess = {
  tool: ToolRequiringApproval;
  decision: ToolApprovalDecision;
};

export const findDecisionsToProcess = (opts: {
  mostRecentUserMessage: MyMessage;
  mostRecentAssistantMessage: MyMessage | undefined;
}): HITLError | HITLDecisionsToProcess[] => {
  const { mostRecentUserMessage, mostRecentAssistantMessage } = opts;

  // NOTE: If there's no assistant message in the chat,
  // there's nothing to process and we can proceed with
  // the conversation.
  if (!mostRecentAssistantMessage) {
    return [];
  }

  // Added: Get all the tools requiring approval from the assistant message
  // and return them in an array.
  const tools: ToolRequiringApproval[] = mostRecentAssistantMessage.parts
    .filter((part) => part.type === "data-approval-request").map((part) =>
      part.data.tool
    );

  // Added: Get all the decisions that the user has made
  // and return them in a map.
  const decisions: Map<string, ToolApprovalDecision> = new Map<
    string,
    ToolApprovalDecision
  >(
    mostRecentUserMessage
      .parts.filter((part) => part.type === "data-approval-decision").map(
        (part) => [part.data.toolId, part.data.decision],
      ),
  );

  console.log("\nApproval Requests:");
  for (const tool of tools) {
    console.log(
      `  - Tool ID: ${tool.id}, Type: ${tool.type}, To: ${tool.to}, Subject: ${tool.subject}, Content: ${tool.content}`,
    );
  }

  console.log("\nApproval Decisions:");
  for (const [toolId, decision] of decisions.entries()) {
    if (decision.type === "approve") {
      console.log(`  - Tool ID: ${toolId}, Decision: Approved`);
    } else if (decision.type === "reject") {
      console.log(
        `  - Tool ID: ${toolId}, Decision: Rejected, Reason: ${decision.reason}`,
      );
    }
  }

  const decisionsToProcess: HITLDecisionsToProcess[] = [];

  for (const tool of tools) {
    const decision: ToolApprovalDecision | undefined = decisions.get(tool.id);

    // found decision for tool request
    console.log(
      `Processing decision for toolId=${tool.id}: `,
      decision ? JSON.stringify(decision) : "No decision found",
    );

    // Added: if the decision is not found, return a HITLError -
    // the user should make a decision before continuing.
    if (!decision) {
      return {
        message: `Pending tool call not settled: ${tool.id}`,
        status: 400,
      } satisfies HITLError;
    }

    // Added: if the decision is found, add the tool and
    // decision to the decisionsToProcess array.
    decisionsToProcess.push({
      tool,
      decision,
    });
  }

  return decisionsToProcess;
};
