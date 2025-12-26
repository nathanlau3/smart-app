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
  /** TTS provider to use */
  provider?: TTSProvider;
  /** Language code */
  lang?: string;
  /** Speech rate */
  rate?: number;
  /** Volume */
  volume?: number;
  /** Pitch (Web Speech only) */
  pitch?: number;
  /** OpenAI voice */
  voice?: OpenAITTSOptions["voice"];
  /** OpenAI model */
  model?: OpenAITTSOptions["model"];
}

/**
 * Orchestrator hook for text-to-speech
 * Supports multiple providers: 'web-speech' (default) and 'openai'
 *
 * @example
 * // Use Web Speech API (default)
 * const { speak, cancel, isSpeaking } = useSpeechSynthesis();
 *
 * @example
 * // Use OpenAI TTS
 * const { speak, cancel, isSpeaking, isLoading } = useSpeechSynthesis({
 *   provider: 'openai',
 *   voice: 'nova'
 * });
 */
export function useSpeechSynthesis({
  provider = "web-speech",
  lang = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
  voice = "alloy",
  model = "tts-1",
}: UseSpeechSynthesisOptions = {}): TTSHookReturn {
  // Initialize both hooks
  // Note: Both are always initialized to maintain hook call order consistency
  const webSpeech = useWebSpeechTTS({ lang, rate, pitch, volume });
  const openAI = useOpenAITTS({ voice, model, rate, volume });

  // Return the appropriate provider's interface
  const result = useMemo((): TTSHookReturn => {
    if (provider === "openai") {
      return {
        ...openAI,
        // Fall back to Web Speech voices for display if needed
        voices: webSpeech.voices,
      };
    }
    return webSpeech;
  }, [provider, openAI, webSpeech]);

  return result;
}

// Re-export types for convenience
export type { TTSProvider, TTSHookReturn };
