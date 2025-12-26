/**
 * TTS Provider Types and Interfaces
 * Supports multiple TTS backends: Web Speech API and OpenAI TTS
 */

export type TTSProvider = "web-speech" | "openai";

export type OpenAIVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";
export type OpenAIModel = "tts-1" | "tts-1-hd";

/**
 * Common TTS options shared across providers
 */
export interface TTSCommonOptions {
  /** Language code (e.g., 'id-ID', 'en-US') */
  lang?: string;
  /** Speech rate (0.25 to 4.0) */
  rate?: number;
  /** Volume (0 to 1) */
  volume?: number;
}

/**
 * Web Speech API specific options
 */
export interface WebSpeechTTSOptions extends TTSCommonOptions {
  /** Pitch (0 to 2, default 1) */
  pitch?: number;
}

/**
 * OpenAI TTS specific options
 */
export interface OpenAITTSOptions extends TTSCommonOptions {
  /** OpenAI voice to use */
  voice?: OpenAIVoice;
  /** OpenAI model (tts-1 for speed, tts-1-hd for quality) */
  model?: OpenAIModel;
}

/**
 * Combined TTS options with provider selection
 */
export interface TTSOptions extends TTSCommonOptions {
  /** TTS provider to use */
  provider?: TTSProvider;
  /** Web Speech specific options */
  webSpeech?: WebSpeechTTSOptions;
  /** OpenAI specific options */
  openai?: OpenAITTSOptions;
}

/**
 * TTS hook state
 */
export interface TTSState {
  /** Whether audio is currently playing */
  isSpeaking: boolean;
  /** Whether audio is being fetched (OpenAI only) */
  isLoading: boolean;
  /** Whether the provider is supported/available */
  isSupported: boolean;
  /** Current error message if any */
  error: string | null;
}

/**
 * TTS hook return interface
 */
export interface TTSHookReturn extends TTSState {
  /** Speak the given text */
  speak: (text: string, customLang?: string) => void;
  /** Cancel current speech */
  cancel: () => void;
  /** Pause current speech (Web Speech only) */
  pause: () => void;
  /** Resume paused speech (Web Speech only) */
  resume: () => void;
  /** Available voices (Web Speech only) */
  voices: SpeechSynthesisVoice[];
}

/**
 * OpenAI TTS API request body
 */
export interface OpenAITTSRequest {
  text: string;
  voice?: OpenAIVoice;
  model?: OpenAIModel;
  speed?: number;
}

/**
 * Clean text for TTS by removing markdown formatting
 */
export function cleanTextForTTS(
  text: string,
  maxLength: number = 4096,
): string {
  let cleanText = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanText.length > maxLength) {
    cleanText = cleanText.substring(0, maxLength) + "...";
    console.warn(
      `Text truncated from ${text.length} to ${maxLength} characters for TTS`,
    );
  }

  return cleanText;
}
