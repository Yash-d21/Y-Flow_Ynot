import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  CHAT_SYSTEM_PROMPT,
  retrieveKnowledge,
  applyOutputGuardrails,
  checkInputGuardrails,
} from "@/lib/knowledge";
import {
  attachProductsToReply,
  searchCatalogProducts,
  formatProductsForPrompt,
} from "@/lib/chat-products";

const schema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional().nullable(),
  visitorName: z.string().optional(),
  visitorEmail: z.string().optional(),
  companyName: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());

    const blocked = checkInputGuardrails(body.message);
    if (blocked) {
      let chatSession = body.sessionId
        ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
        : null;
      if (!chatSession) {
        chatSession = await prisma.chatSession.create({
          data: {
            userId: session.user.id,
            visitorName: body.visitorName || session.user.name,
            visitorEmail: body.visitorEmail || session.user.email,
            companyName: body.companyName,
            status: "OPEN",
          },
        });
      }
      await prisma.chatMessage.create({
        data: { sessionId: chatSession.id, role: "user", content: body.message },
      });
      await prisma.chatMessage.create({
        data: { sessionId: chatSession.id, role: "assistant", content: blocked },
      });
      return NextResponse.json({ sessionId: chatSession.id, reply: blocked, products: [] });
    }

    let chatSession = body.sessionId
      ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
      : null;

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          visitorName: body.visitorName || session.user.name,
          visitorEmail: body.visitorEmail || session.user.email,
          companyName: body.companyName,
          status: "OPEN",
        },
      });
    }

    if (chatSession.status === "HANDED_OFF") {
      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          role: "user",
          content: body.message,
        },
      });
      return NextResponse.json({
        sessionId: chatSession.id,
        reply: null,
        humanMode: true,
        message: "Message delivered to staff. They’ll reply here.",
        products: [],
      });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "user",
        content: body.message,
      },
    });

    const knowledge = retrieveKnowledge(body.message);
    const catalogProducts = await searchCatalogProducts(body.message, 6);
    const catalogBlock = formatProductsForPrompt(catalogProducts);

    const history = await prisma.chatMessage.findMany({
      where: { sessionId: chatSession.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    let reply =
      catalogProducts.length > 0
        ? `Here are some matching catalog options. Tap a product card to order, or use Hand to human for custom decoration quotes.`
        : "I don't have a strong catalog match for that. Try Hand to human, or browse Catalog in the portal.";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const anthropic = createAnthropic({ apiKey });
        const result = await generateText({
          model: anthropic("claude-sonnet-4-5"),
          system: `${CHAT_SYSTEM_PROMPT}

KNOWLEDGE:
${knowledge || "(empty)"}

CATALOG PRODUCTS (recommend only from this list; include name + #sku):
${catalogBlock}

Reply in clear short paragraphs with Markdown bold for product names. Never use em dashes. After recommending, remind the user they can tap a product card to order, or Hand to human.`,
          messages: history
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content.replace(/\n\n<!--YFLOW_PRODUCTS:[\s\S]*?-->/g, ""),
            })),
        });
        reply = applyOutputGuardrails(result.text, knowledge + catalogBlock);
      } catch (err) {
        console.error("claude error", err);
        if (catalogProducts.length) {
          reply = `I found these catalog matches for you:\n\n${catalogProducts
            .map((p) => `- **${p.name}** (#${p.externalId}) - ${p.priceLabel}`)
            .join("\n")}\n\nTap a product card to order, or Hand to human for help.`;
        } else {
          reply =
            "The assistant is temporarily unavailable. Please use Hand to human or try again shortly.";
        }
      }
    } else if (catalogProducts.length) {
      reply = `Here are catalog matches:\n\n${catalogProducts
        .map((p) => `- **${p.name}** (#${p.externalId}) - ${p.category} - ${p.priceLabel}`)
        .join("\n")}\n\nTap a product card to order.`;
    }

    reply = applyOutputGuardrails(reply, knowledge + catalogBlock);

    const stored = attachProductsToReply(reply, catalogProducts);
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "assistant",
        content: stored,
      },
    });

    return NextResponse.json({
      sessionId: chatSession.id,
      reply,
      products: catalogProducts,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
