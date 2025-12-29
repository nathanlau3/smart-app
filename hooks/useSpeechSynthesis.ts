"use client";

import { useMemo } from "react";
import type {
  TTSProvider,
  TTSOptions,
  TTSHookReturn,
  WebSpeechTTSOptions,
  OpenAITTSOptions,
} from "@/types/tts";
import { useWebSpeechTTS } from "./useWebSpeechTTS";
import { useOpenAITTS } from "./useOpenAITTS";

interface UseSpeechSynthesisOptions {
  provider?: TTSProvider;
  lang?: string;
  rate?: number;
  volume?: number;
  pitch?: number;
  voice?: OpenAITTSOptions["voice"];
  model?: OpenAITTSOptions["model"];
}

export function useSpeechSynthesis({
  provider = "web-speech",
  lang = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
  voice = "alloy",
  model = "tts-1",
}: UseSpeechSynthesisOptions = {}): TTSHookReturn {
  const webSpeech = useWebSpeechTTS({ lang, rate, pitch, volume });
  const openAI = useOpenAITTS({ voice, model, rate, volume });

  const result = useMemo((): TTSHookReturn => {
    if (provider === "openai") {
      return {
        ...openAI,
        voices: webSpeech.voices,
      };
    }
    return webSpeech;
  }, [provider, openAI, webSpeech]);

  return result;
}

export type { TTSProvider, TTSHookReturn };
