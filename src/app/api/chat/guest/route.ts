import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  CHAT_SYSTEM_PROMPT,
  retrieveKnowledge,
  applyOutputGuardrails,
  checkInputGuardrails,
} from "@/lib/knowledge";
import {
  searchCatalogProducts,
  formatProductsForPrompt,
} from "@/lib/chat-products";

const schema = z.object({
  message: z.string().min(1).max(4000),
});

/** Public preview chat for the login page (no auth, no handoff persistence). */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const blocked = checkInputGuardrails(body.message);
    if (blocked) {
      return NextResponse.json({ reply: blocked, products: [] });
    }

    const knowledge = retrieveKnowledge(body.message);
    const catalogProducts = await searchCatalogProducts(body.message, 6);
    const catalogBlock = formatProductsForPrompt(catalogProducts);

    let reply =
      catalogProducts.length > 0
        ? `Here are some matching catalog options. Tap a product to continue in the client portal (sign in or use Test Client).`
        : "I don't have a strong catalog match for that. Sign in as a client to browse Catalog or Hand to human.";

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

You are on the public login preview. Keep replies short. Never use em dashes. Tell users to tap a product or sign in as a client to order.`,
          messages: [{ role: "user", content: body.message }],
        });
        reply = applyOutputGuardrails(result.text, knowledge + catalogBlock);
      } catch (err) {
        console.error("guest claude error", err);
        if (catalogProducts.length) {
          reply = `Matching catalog products:\n\n${catalogProducts
            .map((p) => `- **${p.name}** (#${p.externalId}) - ${p.priceLabel}`)
            .join("\n")}\n\nTap a card to continue in the client portal.`;
        }
      }
    } else if (catalogProducts.length) {
      reply = `Matching catalog products:\n\n${catalogProducts
        .map((p) => `- **${p.name}** (#${p.externalId}) - ${p.category} - ${p.priceLabel}`)
        .join("\n")}\n\nTap a card to continue in the client portal.`;
    }

    reply = applyOutputGuardrails(reply, knowledge + catalogBlock);

    return NextResponse.json({
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
