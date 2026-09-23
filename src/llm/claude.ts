import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY, CLAUDE_MODEL } from "../config.js";
import { buildContext, DIGEST_ARTIFACT_SYSTEM_PROMPT } from "./promptContext.js";
import type { DigestArtifactResult, LLMProvider } from "./types.js";
import type { RetrievedChunk } from "../types.js";

const SUBMIT_TOOL = {
  name: "submit_digest_artifact",
  description:
    "Lever een digest-artifact aan: een kort uitlegstuk met een 'in één zin'-samenvatting, uitsluitend gebaseerd op de meegegeven brondocumenten.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Korte titel voor het artifact." },
      oneSentenceSummary: { type: "string", description: "De kern van het artifact in één zin." },
      body: { type: "string", description: "Het uitlegstuk, 100-200 woorden, uitsluitend gebaseerd op de bronfragmenten." },
      citations: {
        type: "array",
        description: "De chunk-id's (exact zoals gegeven, bv. 'bron-1#0') die daadwerkelijk gebruikt zijn.",
        items: { type: "string" },
      },
    },
    required: ["title", "oneSentenceSummary", "body", "citations"],
  },
};

export class ClaudeProvider implements LLMProvider {
  name = "claude";

  async generateDigestArtifact(topic: string, chunks: RetrievedChunk[]): Promise<DigestArtifactResult> {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY ontbreekt. Zet 'm in .env, of gebruik GENERATION_PROVIDER=ollama.");
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system:
        DIGEST_ARTIFACT_SYSTEM_PROMPT +
        " Roep altijd de tool submit_digest_artifact aan, en vermeld in 'citations' alleen " +
        "chunk-id's die je daadwerkelijk gebruikt hebt.",
      tools: [SUBMIT_TOOL],
      tool_choice: { type: "tool", name: "submit_digest_artifact" },
      messages: [
        {
          role: "user",
          content: `Onderwerp/opdracht: "${topic}"\n\nBeschikbare brondocumenten:\n\n${buildContext(chunks)}`,
        },
      ],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude heeft geen submit_digest_artifact tool call teruggegeven.");
    }

    return toolUse.input as DigestArtifactResult;
  }
}
