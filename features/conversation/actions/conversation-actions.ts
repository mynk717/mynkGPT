"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Shape of a conversation row returned in the sidebar list. */
export type ConversationListItem = {
    id: string;
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
};


/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found or not owned by the user.
 */
async function assertOwnsConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId
        }
    });

    if (!conversation) {
        throw new Error("Conversation not found")
    }

    return conversation
}

/**
 * Fetches a single conversation owned by the current user.
 *
 * @param conversationId - The conversation to load.
 * @throws {Error} When the conversation is not found.
 */
export async function getConversation(conversationId: string) {
    const user = await requireUser();
    return assertOwnsConversation(conversationId, user.id)
}


/**
 * Lists non-archived conversations for the current user.
 * Pinned conversations appear first, then sorted by most recent activity.
 */
export async function listConversations(): Promise<ConversationListItem[]> {
    const user = await requireUser();

    return prisma.conversation.findMany({
        where: { userId: user.id, isArchived: false },
        orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
        select: {
            id: true,
            title: true,
            isPinned: true,
            isArchived: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
        },
    })
}

/**
 * Creates a new conversation for the current user.
 *
 * @param title - Optional title; defaults to "New Chat".
 */
export async function createConversation(title = "New Chat") {
    const user = await requireUser();

    return prisma.conversation.create({
        data: {
            userId: user.id,
            title: title.trim() || "New Chat",
        },
    });
}

/**
 * Updates conversation metadata (title, pin, or archive status).
 *
 * @param conversationId - The conversation to update.
 * @param data - Fields to change; omitted fields are left unchanged.
 */
export async function updateConversation(
    conversationId: string,
    data: { title?: string; isPinned?: boolean; isArchived?: boolean }
) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            ...(data.title !== undefined ? { title: data.title.trim() || "New Chat" } : {}),
            ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
            ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        },
    });

    revalidatePath("/");
    revalidatePath(`/c/${conversationId}`);
    return conversation;
}



/**
 * Permanently deletes a conversation owned by the current user.
 *
 * @param conversationId - The conversation to delete.
 * @returns The deleted conversation ID.
 */
export async function deleteConversation(conversationId: string) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    await prisma.conversation.delete({
        where: { id: conversationId },
    });

    revalidatePath("/");
    return { id: conversationId };
}

/**
 * Forks a conversation from a chosen message.
 * Copies the conversation parameters and all messages up to (and including) the chosen message.
 * 
 * @param conversationId - The original conversation ID.
 * @param messageId - The ID of the message to fork from.
 * @returns The new conversation.
 */
export async function forkConversation(conversationId: string, messageId: string) {
    const user = await requireUser();
    const original = await assertOwnsConversation(conversationId, user.id);

    const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
    });

    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
        throw new Error("Message not found in conversation");
    }

    const messagesToCopy = messages.slice(0, index + 1);

    const branched = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: `${original.title} (Forked)`,
            model: original.model,
            systemPrompt: original.systemPrompt,
        },
    });

    const newMessages = messagesToCopy.map((m) => {
        return prisma.message.create({
            data: {
                conversationId: branched.id,
                role: m.role,
                status: m.status,
                content: m.content,
                parts: m.parts ?? undefined,
                metadata: m.metadata ?? undefined,
                createdAt: m.createdAt,
            }
        });
    });

    await prisma.$transaction(newMessages);

    revalidatePath("/");
    revalidatePath(`/c/${branched.id}`);

    return branched;
}