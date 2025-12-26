"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useChat } from "ai/react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  useSpeechSynthesis,
  type TTSProvider,
} from "@/hooks/useSpeechSynthesis";
import { useSpeechAnimation } from "@/hooks/useSpeechAnimation";
import { useAgentAnimation } from "@/hooks/useAgentAnimation";
import { inferEmotionFromSentiment, parseEmotion } from "@/lib/emotionMapper";
import type { Emotion } from "@/types/agent";
import type { OpenAIVoice } from "@/types/tts";
import {
  Mic,
  MicOff,
  VolumeX,
  Send,
  Bot,
  User,
  Loader2,
  X,
  Minus,
  Maximize2,
  Settings2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EdgePosition {
  side: "left" | "right" | "top" | "bottom";
  offset: number;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: EdgePosition;
}

export function ChatModal({
  isOpen,
  onClose,
  position = { side: "right", offset: 85 },
}: ChatModalProps) {
  const supabase = createClientComponentClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("neutral");
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("web-speech");
  const [openAIVoice, setOpenAIVoice] = useState<OpenAIVoice>("alloy");
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<string>("");
  const inputElementRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    agentState,
    setEmotion,
    setIsSpeaking: setAgentSpeaking,
    setAudioLevel,
  } = useAgentAnimation({
    defaultEmotion: "neutral",
  });

  const { isSpeaking: speechAnimationActive, audioLevel: speechAudioLevel } =
    useSpeechAnimation();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
      }
    };
    getSession();
  }, [supabase]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
  } = useChat({
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitVoiceInput = useCallback(() => {
    if (inputRef.current && inputRef.current.trim().length > 0) {
      const syntheticEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      handleSubmit(syntheticEvent as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  const {
    isListening,
    isSupported: isSpeechRecognitionSupported,
    toggleListening,
  } = useSpeechRecognition({
    onResult: (transcript) => setInput(transcript),
    onError: (error) => console.error("Speech recognition error:", error),
    lang: "id-ID",
    continuous: true,
    handleFinish: submitVoiceInput,
  });

  const handleToggleListening = useCallback(
    () => toggleListening(),
    [toggleListening],
  );
  const handleToggleAutoSpeak = useCallback(
    () => setAutoSpeak((prev) => !prev),
    [],
  );

  const {
    speak,
    cancel,
    isSpeaking,
    isLoading: isTTSLoading,
    isSupported: isSpeechSynthesisSupported,
  } = useSpeechSynthesis({
    provider: ttsProvider,
    lang: "id-ID",
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: openAIVoice,
    model: "tts-1",
  });

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const emotion = inferEmotionFromSentiment(lastMessage.content);
        setCurrentEmotion(emotion);
        setEmotion(emotion);
      }
    }
  }, [messages, setEmotion]);

  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const { content: cleanContent } = parseEmotion(lastMessage.content);
        speak(cleanContent);
      }
    }
  }, [messages, autoSpeak, speak]);

  useEffect(() => {
    setAgentSpeaking(isSpeaking);
  }, [isSpeaking, setAgentSpeaking]);

  useEffect(() => {
    setAudioLevel(speechAudioLevel);
  }, [speechAudioLevel, setAudioLevel]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputElementRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Calculate modal position based on edge position
  const getPositionStyle = (): React.CSSProperties => {
    const modalWidth = 420;
    const modalHeight = 600;
    const margin = 16;
    const triggerSize = 56;

    switch (position.side) {
      case "left":
        return {
          left: margin + triggerSize + 8,
          top: `calc(${position.offset}% - ${modalHeight / 2}px)`,
        };
      case "right":
        return {
          right: margin + triggerSize + 8,
          top: `calc(${position.offset}% - ${modalHeight / 2}px)`,
        };
      case "top":
        return {
          top: margin + 64 + triggerSize + 8,
          left: `calc(${position.offset}% - ${modalWidth / 2}px)`,
        };
      case "bottom":
        return {
          bottom: margin + triggerSize + 8,
          left: `calc(${position.offset}% - ${modalWidth / 2}px)`,
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      style={getPositionStyle()}
      className="fixed z-50 transition-all duration-300 ease-out w-[420px]"
    >
      <div
        className={cn(
          "bg-card backdrop-blur-xl rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 flex flex-col",
          isMinimized ? "h-14" : "h-[600px] max-h-[80vh]",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 bg-gradient-to-r from-primary/10 to-transparent border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-none mb-0.5">
                AI Assistant
              </h3>
              <p className="text-[11px] text-muted-foreground leading-none">
                {agentState.isSpeaking ? (
                  <span className="text-primary">Speaking...</span>
                ) : (
                  <span className="capitalize">{agentState.emotion}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="relative mb-6">
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                      style={{
                        background: `radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)`,
                      }}
                    />
                    <div className="relative w-24 h-24 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                      <Bot
                        className="w-12 h-12 text-primary"
                        style={{
                          animation: agentState.isSpeaking
                            ? "pulse 1s ease-in-out infinite"
                            : "none",
                        }}
                      />
                    </div>
                  </div>
                  <h4 className="text-base font-medium text-foreground mb-1">
                    How can I help you?
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-[240px]">
                    Ask me anything about your documents and reports
                  </p>
                </div>
              ) : (
                messages.map(
                  ({
                    id,
                    role,
                    content,
                  }: {
                    id: string;
                    role: string;
                    content: string;
                  }) => {
                    const displayContent =
                      role === "assistant"
                        ? parseEmotion(content).content
                        : content;
                    return (
                      <div
                        key={id}
                        className={cn(
                          "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                          role === "user" ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        <div
                          className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                            role === "user" ? "bg-primary" : "bg-muted",
                          )}
                        >
                          {role === "user" ? (
                            <User className="w-4 h-4 text-primary-foreground" />
                          ) : (
                            <Bot className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm max-w-[80%]",
                            role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          {role === "assistant" ? (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0 text-foreground text-sm leading-relaxed">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc ml-4 mb-2 text-foreground text-sm space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal ml-4 mb-2 text-foreground text-sm space-y-1">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-foreground text-sm">
                                      {children}
                                    </li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold">
                                      {children}
                                    </strong>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">
                                      {children}
                                    </code>
                                  ),
                                  pre: ({ children }) => (
                                    <pre className="bg-background/50 p-3 rounded-lg my-2 overflow-x-auto text-xs">
                                      {children}
                                    </pre>
                                  ),
                                }}
                              >
                                {displayContent}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="leading-relaxed">{displayContent}</p>
                          )}
                        </div>
                      </div>
                    );
                  },
                )
              )}

              {isLoading && (
                <div className="flex gap-3 animate-in fade-in duration-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                    <Bot className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Voice Settings Panel */}
            {showSettings && (
              <div className="px-4 py-3 bg-muted/30 border-t border-border space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Voice Settings
                  </span>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">
                    TTS:
                  </span>
                  <div className="flex bg-muted rounded-lg p-0.5 flex-1">
                    <button
                      onClick={() => setTtsProvider("web-speech")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        ttsProvider === "web-speech"
                          ? "bg-card shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Browser
                    </button>
                    <button
                      onClick={() => setTtsProvider("openai")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        ttsProvider === "openai"
                          ? "bg-card shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      OpenAI
                    </button>
                  </div>
                </div>
                {ttsProvider === "openai" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">
                      Voice:
                    </span>
                    <select
                      value={openAIVoice}
                      onChange={(e) =>
                        setOpenAIVoice(e.target.value as OpenAIVoice)
                      }
                      className="flex-1 h-8 px-2 text-xs bg-muted border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="alloy">Alloy</option>
                      <option value="echo">Echo</option>
                      <option value="fable">Fable</option>
                      <option value="onyx">Onyx</option>
                      <option value="nova">Nova</option>
                      <option value="shimmer">Shimmer</option>
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">
                    Auto:
                  </span>
                  <button
                    onClick={handleToggleAutoSpeak}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all border",
                      autoSpeak
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <form
              className="p-4 border-t border-border bg-card shrink-0"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-2">
                {isSpeechRecognitionSupported && (
                  <button
                    type="button"
                    onClick={handleToggleListening}
                    className={cn(
                      "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isListening
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                    )}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                )}
                <Input
                  ref={inputElementRef}
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onChange={handleInputChange}
                  className="flex-1 h-10 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl text-sm"
                />
                {isSpeechSynthesisSupported && (
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={cn(
                      "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      showSettings
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                    )}
                    title="Voice settings"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                )}
                {(isSpeaking || isTTSLoading) && (
                  <button
                    type="button"
                    onClick={cancel}
                    className="shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                    title="Stop speaking"
                  >
                    {isTTSLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                )}
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !authToken || !input.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
