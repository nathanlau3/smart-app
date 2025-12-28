"use client";

import { cn } from "@/lib/utils";
import { AnimatedAgent } from "@/components/AnimatedAgent";
import type { Emotion } from "@/types/agent";

interface ChatSidebarProps {
  agentState: {
    emotion: Emotion;
    isSpeaking: boolean;
    audioLevel: number;
  };
}

export function ChatSidebar({ agentState }: ChatSidebarProps) {
  return (
    <div className="hidden lg:flex flex-shrink-0 w-72 border-r border-border p-4 flex-col items-center justify-center bg-muted/20">
      <AnimatedAgent
        emotion={agentState.emotion}
        isSpeaking={agentState.isSpeaking}
        audioLevel={agentState.audioLevel}
      />

      {/* AI Status Card */}
      <div className="mt-4 p-3 rounded-xl bg-card/50 border border-border/50 w-full">
        <h3 className="text-xs font-semibold text-foreground mb-2">
          AI Status
        </h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Emotion:</span>
            <span className="text-primary font-medium capitalize">
              {agentState.emotion}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>State:</span>
            <span
              className={cn(
                "font-medium",
                agentState.isSpeaking
                  ? "text-green-500"
                  : "text-muted-foreground",
              )}
            >
              {agentState.isSpeaking ? "Speaking" : "Idle"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
