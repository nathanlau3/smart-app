export type TTSProvider = "web-speech" | "openai";

export type OpenAIVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";
export type OpenAIModel = "tts-1" | "tts-1-hd";

export interface TTSCommonOptions {
  lang?: string;
  rate?: number;
  volume?: number;
}

export interface WebSpeechTTSOptions extends TTSCommonOptions {
  pitch?: number;
}

export interface OpenAITTSOptions extends TTSCommonOptions {
  voice?: OpenAIVoice;
  model?: OpenAIModel;
}

export interface TTSOptions extends TTSCommonOptions {
  provider?: TTSProvider;
  webSpeech?: WebSpeechTTSOptions;
  openai?: OpenAITTSOptions;
}

export interface TTSState {
  isSpeaking: boolean;
  isLoading: boolean;
  isSupported: boolean;
  error: string | null;
}

export interface TTSHookReturn extends TTSState {
  speak: (text: string, customLang?: string) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  voices: SpeechSynthesisVoice[];
}

export interface OpenAITTSRequest {
  text: string;
  voice?: OpenAIVoice;
  model?: OpenAIModel;
  speed?: number;
}

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
