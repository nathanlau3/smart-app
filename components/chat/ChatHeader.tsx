"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TTSProvider } from "@/hooks/useSpeechSynthesis";
import type { OpenAIVoice } from "@/types/tts";
import { Mic, MicOff, Volume2, VolumeX, Bot, Loader2 } from "lucide-react";

interface ChatHeaderProps {
  isListening: boolean;
  isSpeechRecognitionSupported: boolean;
  onToggleListening: () => void;
  ttsProvider: TTSProvider;
  openAIVoice: OpenAIVoice;
  autoSpeak: boolean;
  isSpeaking: boolean;
  isTTSLoading: boolean;
  isSpeechSynthesisSupported: boolean;
  onSetTtsProvider: (provider: TTSProvider) => void;
  onSetOpenAIVoice: (voice: OpenAIVoice) => void;
  onToggleAutoSpeak: () => void;
  onCancelSpeaking: () => void;
}

export function ChatHeader({
  isListening,
  isSpeechRecognitionSupported,
  onToggleListening,
  ttsProvider,
  openAIVoice,
  autoSpeak,
  isSpeaking,
  isTTSLoading,
  isSpeechSynthesisSupported,
  onSetTtsProvider,
  onSetOpenAIVoice,
  onToggleAutoSpeak,
  onCancelSpeaking,
}: ChatHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-border backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            AI Chat Assistant
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your documents
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isSpeechRecognitionSupported && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleListening}
            className={cn(
              "transition-all duration-300 border-border hover:border-primary/50",
              isListening &&
                "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20",
            )}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Voice
              </>
            )}
          </Button>
        )}

        {isSpeechSynthesisSupported && (
          <>
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => onSetTtsProvider("web-speech")}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md transition-all duration-200",
                  ttsProvider === "web-speech"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Browser
              </button>
              <button
                type="button"
                onClick={() => onSetTtsProvider("openai")}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md transition-all duration-200",
                  ttsProvider === "openai"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                OpenAI
              </button>
            </div>

            {ttsProvider === "openai" && (
              <select
                value={openAIVoice}
                onChange={(e) =>
                  onSetOpenAIVoice(e.target.value as OpenAIVoice)
                }
                className="h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleAutoSpeak}
              className={cn(
                "transition-all duration-300 border-border hover:border-primary/50",
                autoSpeak &&
                  "bg-primary/10 border-primary text-primary hover:bg-primary/20",
              )}
            >
              {autoSpeak ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            {(isSpeaking || isTTSLoading) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelSpeaking}
                className="border-border hover:border-primary/50 transition-all duration-300"
              >
                {isTTSLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Stop"
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
