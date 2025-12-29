"use client";

import { cn } from "@/lib/utils";
import { parseEmotion } from "@/lib/emotionMapper";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map(({ id, role, content }) => {
        const displayContent =
          role === "assistant" ? parseEmotion(content).content : content;

        return (
          <div
            key={id}
            className={cn(
              "flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500",
              role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300",
                role === "user"
                  ? "bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40"
                  : "bg-card border-2 border-border",
              )}
            >
              {role === "user" ? (
                <User className="w-5 h-5 text-primary" />
              ) : (
                <Bot className="w-5 h-5 text-primary" />
              )}
            </div>

            <div
              className={cn(
                "flex-1 max-w-2xl rounded-2xl px-5 py-4 shadow-lg backdrop-blur-md transition-all duration-300",
                role === "user"
                  ? "bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 text-foreground"
                  : "bg-muted/50 border border-border",
              )}
            >
              {role === "assistant" ? (
                <div className="prose prose-slate prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 text-foreground">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-4 mb-2 text-foreground">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-4 mb-2 text-foreground">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="mb-1 text-foreground">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-primary">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-foreground/70">
                          {children}
                        </em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono text-primary">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted p-4 rounded-lg my-2 overflow-x-auto border border-border">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-foreground">{displayContent}</p>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-4 items-start animate-in fade-in duration-500">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-card border-2 border-border shadow-md">
            <Bot className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="rounded-2xl px-5 py-4 max-w-2xl bg-muted/50 border border-border shadow-lg">
            <div className="flex gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-md"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-md"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-md"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center flex-col gap-6 py-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:blur-2xl transition-all duration-500" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 shadow-xl group-hover:scale-110 transition-all duration-500">
              <Bot className="w-16 h-16 text-primary relative animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-3 max-w-md">
            <h3 className="text-xl font-bold text-foreground">
              Welcome! Let's Start a Conversation
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ask questions about your documents, analyze police reports (K3I),
              or get insights from your data.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Ready to assist
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
