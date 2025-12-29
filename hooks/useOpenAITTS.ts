"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { OpenAITTSOptions, TTSHookReturn } from "@/types/tts";
import { cleanTextForTTS } from "@/types/tts";

interface UseOpenAITTSOptions extends OpenAITTSOptions {
  onConfigCheck?: (configured: boolean) => void;
}

export function useOpenAITTS({
  voice = "alloy",
  model = "tts-1",
  rate = 1,
  volume = 1,
  onConfigCheck,
}: UseOpenAITTSOptions = {}): TTSHookReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch("/api/tts");
        const data = await response.json();
        setIsSupported(data.configured);
        onConfigCheck?.(data.configured);
        if (!data.configured) {
          console.warn("OpenAI TTS not configured - missing API key");
        }
      } catch (err) {
        console.error("Failed to check OpenAI TTS config:", err);
        setIsSupported(false);
      }
    };
    checkConfig();
  }, [onConfigCheck]);

  const speak = useCallback(
    async (text: string, _customLang?: string) => {
      if (!isSupported) {
        setError("OpenAI TTS not configured");
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setError(null);
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();

        const cleanText = cleanTextForTTS(text, 4096);
        console.log("OpenAI TTS - Text length:", cleanText.length);

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleanText,
            voice,
            model,
            speed: rate,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate speech");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audio.volume = volume;
        audioRef.current = audio;

        audio.onplay = () => {
          console.log("✓ OpenAI TTS started");
          setIsSpeaking(true);
          setIsLoading(false);
        };

        audio.onended = () => {
          console.log("✓ OpenAI TTS ended");
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error("✗ OpenAI TTS playback error:", e);
          setError("Failed to play audio");
          setIsSpeaking(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audio.play();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("OpenAI TTS request aborted");
          return;
        }
        console.error("OpenAI TTS error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
        setIsSpeaking(false);
      }
    },
    [isSupported, voice, model, rate, volume],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isLoading,
    isSupported,
    error,
    voices: [],
  };
}
