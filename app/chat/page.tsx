"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useChat } from "ai/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechAnimation } from "@/hooks/useSpeechAnimation";
import { useAgentAnimation } from "@/hooks/useAgentAnimation";
import { AnimatedAgent } from "@/components/AnimatedAgent";
import { inferEmotionFromSentiment, parseEmotion } from "@/lib/emotionMapper";
import type { Emotion } from "@/types/agent";
import { Mic, MicOff, Volume2, VolumeX, Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatPage() {
  const supabase = createClientComponentClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("neutral");
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
    isSupported: isSpeechSynthesisSupported,
  } = useSpeechSynthesis({
    lang: "id-ID",
    rate: 1,
    pitch: 1,
    volume: 1,
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
    <div className="max-w-[1600px] mx-auto flex flex-col items-center w-full h-full relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
      <div
        className="absolute bottom-20 right-1/3 w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-pulse-glow pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      <div className="flex flex-col lg:flex-row w-full gap-8 grow my-6 sm:my-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:w-96 flex-shrink-0">
          <div className="gradient-border p-6 backdrop-blur-md sticky rounded-3xl shadow-2xl">
            <AnimatedAgent
              emotion={agentState.emotion}
              isSpeaking={agentState.isSpeaking}
              audioLevel={agentState.audioLevel}
            />

            <div className="mt-6 p-4 rounded-2xl bg-card/50 border border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                AI Assistant Status
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground">
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
        </div>

        <div className="flex flex-col w-full gap-6 grow min-h-0">
          <div className="gradient-border p-5 backdrop-blur-md rounded-2xl shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {isSpeechRecognitionSupported ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleListening}
                    className={cn(
                      "transition-all duration-300 border-border hover:border-primary/50",
                      isListening &&
                        "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 ai-glow",
                    )}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Voice Input
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Voice input not supported
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isSpeechSynthesisSupported && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAutoSpeak}
                      className={cn(
                        "transition-all duration-300 border-border hover:border-primary/50",
                        autoSpeak &&
                          "bg-primary/10 border-primary text-primary hover:bg-primary/20 ai-glow",
                      )}
                    >
                      {autoSpeak ? (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Auto-speak On
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-4 w-4 mr-2" />
                          Auto-speak Off
                        </>
                      )}
                    </Button>
                    {isSpeaking && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancel}
                        className="border-border hover:border-primary/50 transition-all duration-300"
                      >
                        Stop Speaking
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-start gap-6 grow overflow-y-auto px-2 pb-4 scroll-smooth">
            {messages.map(({ id, role, content }) => {
              const displayContent =
                role === "assistant" ? parseEmotion(content).content : content;

              return (
                <div
                  key={id}
                  className={cn(
                    "flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-700",
                    role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                      role === "user"
                        ? "bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 hover:scale-110"
                        : "bg-card border-2 border-border ai-glow hover:scale-110",
                    )}
                  >
                    {role === "user" ? (
                      <User className="w-6 h-6 text-primary" />
                    ) : (
                      <Bot className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex-1 max-w-3xl rounded-2xl px-6 py-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl",
                      role === "user"
                        ? "bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/25 text-foreground"
                        : "gradient-border bg-card/50",
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
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-card border-2 border-border ai-glow shadow-lg">
                  <Bot className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="gradient-border rounded-2xl px-6 py-5 max-w-3xl bg-card/50 shadow-xl">
                  <div className="flex gap-2">
                    <div
                      className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-lg"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-lg"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-lg"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex grow items-center justify-center flex-col gap-6 animate-in fade-in duration-1000">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full group-hover:blur-2xl transition-all duration-500" />
                  <div className="relative p-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 shadow-2xl group-hover:scale-110 transition-all duration-500">
                    <Bot className="w-20 h-20 text-primary relative animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-3 max-w-lg">
                  <h3 className="text-2xl font-bold gradient-text">
                    Welcome! Let's Start a Conversation
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Ask questions about your documents, analyze police reports
                    (K3I), or get insights from your data. I'm here to help!
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

          <form
            className="gradient-border p-6 backdrop-blur-md sticky bottom-0 rounded-2xl shadow-2xl"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center gap-4">
              <Input
                ref={inputElementRef}
                type="text"
                autoFocus
                placeholder="Ask anything about your documents..."
                value={input}
                onChange={handleInputChange}
                className="flex-1 h-12 bg-background/60 border-2 border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl px-4 text-base shadow-inner"
              />
              <Button
                type="submit"
                disabled={isLoading || !authToken}
                className="h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground ai-glow-lg transition-all duration-300 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 mr-2" />
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
