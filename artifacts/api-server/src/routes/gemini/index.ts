import { Router, type IRouter } from "express";
import { eq, sql, desc, gte } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  CreateGeminiConversationBody,
  GetGeminiConversationParams,
  DeleteGeminiConversationParams,
  ListGeminiMessagesParams,
  SendGeminiMessageParams,
  SendGeminiMessageBody,
  UpdateGeminiConversationTitleParams,
  UpdateGeminiConversationTitleBody,
  RegenerateGeminiMessageParams,
} from "@workspace/api-zod";

const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];
const DEFAULT_MODEL: AllowedModel = "gemini-2.5-flash";

function resolveModel(raw: unknown): AllowedModel {
  if (typeof raw === "string" && ALLOWED_MODELS.includes(raw as AllowedModel)) {
    return raw as AllowedModel;
  }
  return DEFAULT_MODEL;
}

const router: IRouter = Router();

router.get("/gemini/conversations", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      messageCount: sql<number>`cast(count(${messages.id}) as int)`,
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.updatedAt));

  res.json(rows);
});

router.post("/gemini/conversations", async (req, res): Promise<void> => {
  const parsed = CreateGeminiConversationBody.safeParse(req.body);

  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.success && parsed.data.title ? parsed.data.title : "New Chat" })
    .returning();

  res.status(201).json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messageCount: 0,
  });
});

router.get("/gemini/conversations/:id", async (req, res): Promise<void> => {
  const params = GetGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messages: msgs,
  });
});

router.delete("/gemini/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/gemini/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListGeminiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

router.post("/gemini/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendGeminiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendGeminiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const model = resolveModel((req.body as Record<string, unknown>).model);

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: params.data.id,
    role: "user",
    content: body.data.content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        maxOutputTokens: 8192,
        ...(body.data.systemInstruction ? { systemInstruction: body.data.systemInstruction } : {}),
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: params.data.id,
      role: "assistant",
      content: fullResponse,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, params.data.id));

    if (conv.title === "New Chat" && history.length === 1) {
      const titleStream = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a short, concise title (4-6 words max) for a conversation that starts with this message: "${body.data.content}". Respond with ONLY the title, no quotes, no punctuation at the end.`,
              },
            ],
          },
        ],
        config: { maxOutputTokens: 20 },
      });

      const generatedTitle = titleStream.text?.trim();
      if (generatedTitle) {
        await db
          .update(conversations)
          .set({ title: generatedTitle })
          .where(eq(conversations.id, params.data.id));
        res.write(`data: ${JSON.stringify({ titleUpdate: generatedTitle })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gemini stream error");
    res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    res.end();
  }
});

router.post("/gemini/conversations/:id/regenerate", async (req, res): Promise<void> => {
  const params = RegenerateGeminiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const model = resolveModel((req.body as Record<string, unknown>).model);

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  if (history.length === 0) {
    res.status(400).json({ error: "No messages to regenerate" });
    return;
  }

  const lastMsg = history[history.length - 1];
  if (lastMsg.role === "assistant") {
    await db.delete(messages).where(eq(messages.id, lastMsg.id));
    history.pop();
  }

  if (history.length === 0) {
    res.status(400).json({ error: "No user message found to regenerate from" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: params.data.id,
      role: "assistant",
      content: fullResponse,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, params.data.id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gemini regenerate stream error");
    res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    res.end();
  }
});

router.post("/gemini/conversations/:id/edit", async (req, res): Promise<void> => {
  const convId = parseInt(req.params.id, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }

  const { messageId, content, systemInstruction, model: rawModel } = req.body as {
    messageId?: number;
    content?: string;
    systemInstruction?: string;
    model?: unknown;
  };

  if (typeof messageId !== "number" || !content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "messageId (number) and content (string) are required" });
    return;
  }

  const model = resolveModel(rawModel);

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convId));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [targetMsg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (!targetMsg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  await db
    .delete(messages)
    .where(gte(messages.id, targetMsg.id));

  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: content.trim(),
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        maxOutputTokens: 8192,
        ...(systemInstruction?.trim() ? { systemInstruction: systemInstruction.trim() } : {}),
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: fullResponse,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, convId));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gemini edit stream error");
    res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    res.end();
  }
});

router.patch("/gemini/conversations/:id/title", async (req, res): Promise<void> => {
  const params = UpdateGeminiConversationTitleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateGeminiConversationTitleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(conversations)
    .set({ title: body.data.title, updatedAt: new Date() })
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json({
    id: updated.id,
    title: updated.title,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    messageCount: 0,
  });
});

export default router;
