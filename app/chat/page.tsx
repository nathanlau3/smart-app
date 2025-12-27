"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useChat } from "ai/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  useSpeechSynthesis,
  type TTSProvider,
} from "@/hooks/useSpeechSynthesis";
import { useSpeechAnimation } from "@/hooks/useSpeechAnimation";
import { useAgentAnimation } from "@/hooks/useAgentAnimation";
import { AnimatedAgent } from "@/components/AnimatedAgent";
import { inferEmotionFromSentiment, parseEmotion } from "@/lib/emotionMapper";
import type { Emotion } from "@/types/agent";
import type { OpenAIVoice } from "@/types/tts";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatPage() {
  const supabase = createClientComponentClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("neutral");
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("web-speech");
  const [openAIVoice, setOpenAIVoice] = useState<OpenAIVoice>("alloy");
  const inputRef = useRef<string>("");
  const inputElementRef = useRef<HTMLInputElement>(null);

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
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {},
  });

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const submitVoiceInput = useCallback(() => {
    console.log("handleFinish called, current input:", inputRef.current);
    if (inputRef.current && inputRef.current.trim().length > 0) {
      const syntheticEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      handleSubmit(syntheticEvent as any);
    }
  }, [handleSubmit]);

  const {
    isListening,
    isSupported: isSpeechRecognitionSupported,
    toggleListening,
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setInput(transcript);
    },
    onError: (error) => {
      console.error("Speech recognition error:", error);
    },
    lang: "id-ID",
    continuous: true,
    handleFinish: submitVoiceInput,
  });

  const handleToggleListening = useCallback(() => {
    console.log("Toggle listening clicked");
    toggleListening();
  }, [toggleListening]);

  const handleToggleAutoSpeak = useCallback(() => {
    console.log("Toggle auto-speak clicked");
    setAutoSpeak((prev) => !prev);
  }, []);

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
      console.log("Last message:", lastMessage);
      if (lastMessage.role === "assistant") {
        const { content: cleanContent } = parseEmotion(lastMessage.content);
        console.log("Speaking content:", cleanContent);
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] overflow-hidden bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
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
                onClick={handleToggleListening}
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
                    onClick={() => setTtsProvider("web-speech")}
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
                    onClick={() => setTtsProvider("openai")}
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
                      setOpenAIVoice(e.target.value as OpenAIVoice)
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
                  onClick={handleToggleAutoSpeak}
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
                    onClick={cancel}
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

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Agent Sidebar */}
          <div className="hidden lg:flex flex-shrink-0 w-72 border-r border-border p-4 flex-col items-center justify-center bg-muted/20">
            <AnimatedAgent
              emotion={agentState.emotion}
              isSpeaking={agentState.isSpeaking}
              audioLevel={agentState.audioLevel}
            />
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

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map(({ id, role, content }) => {
                const displayContent =
                  role === "assistant"
                    ? parseEmotion(content).content
                    : content;

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
                                <li className="mb-1 text-foreground">
                                  {children}
                                </li>
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
                      Ask questions about your documents, analyze police reports
                      (K3I), or get insights from your data.
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

            {/* Input Form */}
            <form
              className="flex-shrink-0 p-4 border-t border-border bg-card/50 backdrop-blur-xl"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-3">
                <Input
                  ref={inputElementRef}
                  type="text"
                  autoFocus
                  placeholder="Ask anything about your documents..."
                  value={input}
                  onChange={handleInputChange}
                  className="flex-1 h-12 bg-background/60 border-2 border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl px-4 text-base"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !authToken}
                  className="h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
