import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, tool, type UIMessage } from "ai";
import { z } from "zod";


/**
 * Scrapes plain text content from a given web URL.
 */
async function scrapeUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });
        if (!response.ok) {
            return `Failed to fetch URL: ${response.statusText}`;
        }
        const html = await response.text();
        
        // Strip script and style tags
        let cleanText = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
        cleanText = cleanText.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
        
        // Replace block-level tags with newlines
        cleanText = cleanText.replace(/<\/div>/gi, "\n");
        cleanText = cleanText.replace(/<\/p>/gi, "\n");
        cleanText = cleanText.replace(/<\/h[1-6]>/gi, "\n");
        cleanText = cleanText.replace(/<br\s*\/?>/gi, "\n");

        // Strip other HTML tags
        cleanText = cleanText.replace(/<[^>]+>/g, "");
        
        // Decode HTML entities
        cleanText = cleanText
            .replace(/&nbsp;/g, " ")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Collapse whitespace
        cleanText = cleanText.replace(/[ \t]+/g, " ");
        cleanText = cleanText.replace(/\n\s*\n+/g, "\n\n");
        
        return cleanText.trim().slice(0, 10000);
    } catch (error: any) {
        return `Error scraping URL: ${error.message}`;
    }
}

/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK with support for tool calling.
 */
export async function POST(req: Request) {
    await auth.protect();

    const { message, id }: { message: UIMessage, id: string } = await req.json();

    if (!message || !id) {
        return new Response("Missing message or conversation id", { status: 400 });
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(id);

    const alreadySaved = previousMessages.some(
        (storedMessage)=>storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if(!alreadySaved){
        await saveChatMessages(id, [message]);
    }

    const result = streamText({
        model: getChatModel(conversation.model),
        system: conversation.systemPrompt ?? "You are ChaiGpt , a helpful assistant with ability to scrape web pages.",
        messages: await convertToModelMessages(messages),
        stopWhen: isStepCount(5),
        tools: {
            scrapeWeb: tool({
                description: "Scrape text content from any website URL.",
                inputSchema: z.object({
                    url: z.string().url().describe("The absolute URL of the webpage to scrape."),
                }),
                execute: async ({ url }: { url: string }) => {
                    const content = await scrapeUrl(url);
                    return { url, content };
                },
            }),
        },
        onError: ({ error }) => {
            // Swallow the "model output must contain either output text or tool calls"
            // validation error that OpenAI emits between a tool-result step and the
            // final text step. The stream continues correctly despite this warning.
            const msg = error instanceof Error ? error.message : String(error);
            if (!msg.includes("model output must contain")) {
                console.error("[chat] streamText error:", error);
            }
        },
    });

    result.consumeStream();

    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
           stream:result.stream,
           originalMessages:messages,
           generateMessageId:createIdGenerator({prefix:"msg" , size:16}),
           onEnd:async({messages:finalMessages})=>{
            try {
                await saveChatMessages(id , finalMessages , {updateTitle:false})
            } catch (error) {
                console.error(error);
            }
           }
        })
    })

}