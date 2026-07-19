"use client";

import { isTextUIPart, type UIMessage, isToolUIPart, getToolName } from "ai";
import type { ChatStatus } from "ai";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { forkConversation } from "../actions/conversation-actions";
import { GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";

type ChatMessagesProps = {
  conversationId: string;
  messages: UIMessage[];
  status: ChatStatus;
};

/**
 * Renders the conversation message list with markdown responses, tool progress steps, and branching.
 */
export function ChatMessages({ conversationId, messages, status }: ChatMessagesProps) {
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleFork = (messageId: string) => {
    startTransition(async () => {
      try {
        const newConv = await forkConversation(conversationId, messageId);
        toast.success("Conversation forked successfully!");
        router.push(`/c/${newConv.id}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to fork conversation");
      }
    });
  };

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return <MessageResponse key={index}>{part.text}</MessageResponse>;
                }
                if (isToolUIPart(part)) {
                  const toolName = getToolName(part);
                  const isDone = part.state === "output-available";
                  return (
                    <div key={index} className={`flex items-center gap-2 text-xs font-mono text-muted-foreground p-2 rounded border my-1 ${
                      isDone 
                        ? "bg-muted/30 border-border/30" 
                        : "bg-muted/60 border-border/50"
                    }`}>
                      <span>{isDone ? "✅ Executed:" : "🔧 Calling tool:"}</span>
                      <strong className="text-foreground">{toolName}</strong>
                    </div>
                  );
                }
                return null;
              })}

              <MessageToolbar className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                <MessageActions>
                  <MessageAction
                    tooltip="Fork conversation from this point"
                    disabled={isPending}
                    onClick={() => handleFork(message.id)}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                  </MessageAction>
                </MessageActions>
              </MessageToolbar>
            </MessageContent>
          </Message>
        ))}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
    </Conversation>
  );
}
