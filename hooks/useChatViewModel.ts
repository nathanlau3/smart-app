"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export interface ChatViewModelState {
  // Authentication
  authToken: string | null;

  // Chat
  messages: Array<{ id: string; role: string; content: string }>;
  input: string;
  isLoading: boolean;

  // Speech Recognition
  isListening: boolean;
  isSpeechRecognitionSupported: boolean;

  // Text-to-Speech
  ttsProvider: TTSProvider;
  openAIVoice: OpenAIVoice;
  autoSpeak: boolean;
  isSpeaking: boolean;
  isTTSLoading: boolean;
  isSpeechSynthesisSupported: boolean;

  // Agent
  agentState: {
    emotion: Emotion;
    isSpeaking: boolean;
    audioLevel: number;
  };
}

export interface ChatViewModelActions {
  // Chat
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;

  // Speech Recognition
  toggleListening: () => void;

  // Text-to-Speech
  setTtsProvider: (provider: TTSProvider) => void;
  setOpenAIVoice: (voice: OpenAIVoice) => void;
  toggleAutoSpeak: () => void;
  cancelSpeaking: () => void;
}

export interface ChatViewModel {
  state: ChatViewModelState;
  actions: ChatViewModelActions;
  refs: {
    inputElementRef: React.RefObject<HTMLInputElement>;
  };
}

export function useChatViewModel(): ChatViewModel {
  const supabase = createClientComponentClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("web-speech");
  const [openAIVoice, setOpenAIVoice] = useState<OpenAIVoice>("alloy");
  const inputRef = useRef<string>("");
  const inputElementRef = useRef<HTMLInputElement>(null);

  // Agent animation hook
  const {
    agentState,
    setEmotion,
    setIsSpeaking: setAgentSpeaking,
    setAudioLevel,
  } = useAgentAnimation({
    defaultEmotion: "neutral",
  });

  // Speech animation for audio levels
  const { audioLevel: speechAudioLevel } = useSpeechAnimation();

  // Fetch auth token on mount
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

  // Chat hook from AI SDK
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

  // Keep inputRef in sync for voice input
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  // Voice input submission handler
  const submitVoiceInput = useCallback(() => {
    if (inputRef.current && inputRef.current.trim().length > 0) {
      const syntheticEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      handleSubmit(syntheticEvent as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  // Speech recognition hook
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

  // Text-to-speech hook
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

  // Update agent emotion based on assistant messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const emotion = inferEmotionFromSentiment(lastMessage.content);
        setEmotion(emotion);
      }
    }
  }, [messages, setEmotion]);

  // Auto-speak assistant messages
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const { content: cleanContent } = parseEmotion(lastMessage.content);
        speak(cleanContent);
      }
    }
  }, [messages, autoSpeak, speak]);

  // Sync speaking state with agent
  useEffect(() => {
    setAgentSpeaking(isSpeaking);
  }, [isSpeaking, setAgentSpeaking]);

  // Sync audio level with agent
  useEffect(() => {
    setAudioLevel(speechAudioLevel);
  }, [speechAudioLevel, setAudioLevel]);

  // Action handlers
  const handleToggleListening = useCallback(() => {
    toggleListening();
  }, [toggleListening]);

  const handleToggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => !prev);
  }, []);

  return {
    state: {
      authToken,
      messages,
      input,
      isLoading,
      isListening,
      isSpeechRecognitionSupported,
      ttsProvider,
      openAIVoice,
      autoSpeak,
      isSpeaking,
      isTTSLoading,
      isSpeechSynthesisSupported,
      agentState,
    },
    actions: {
      handleInputChange,
      handleSubmit,
      toggleListening: handleToggleListening,
      setTtsProvider,
      setOpenAIVoice,
      toggleAutoSpeak: handleToggleAutoSpeak,
      cancelSpeaking: cancel,
    },
    refs: {
      inputElementRef,
    },
  };
}
