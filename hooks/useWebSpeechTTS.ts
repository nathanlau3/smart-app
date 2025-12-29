"use client";

import { useEffect, useState, useCallback } from "react";
import type { WebSpeechTTSOptions, TTSHookReturn } from "@/types/tts";
import { cleanTextForTTS } from "@/types/tts";

export function useWebSpeechTTS({
  lang = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
}: WebSpeechTTSOptions = {}): TTSHookReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const initSpeech = () => {
      const utterance = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(utterance);
      console.log("✓ Speech synthesis initialized for Chrome");
    };

    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, initSpeech, { once: true });
    });

    return () => {
      window.speechSynthesis.cancel();
      events.forEach((event) => {
        document.removeEventListener(event, initSpeech);
      });
    };
  }, []);

  const speak = useCallback(
    (text: string, customLang?: string) => {
      if (!window.speechSynthesis) {
        setError("Speech synthesis not supported");
        console.error("Speech synthesis not supported");
        return;
      }

      setError(null);
      window.speechSynthesis.cancel();

      const cleanText = cleanTextForTTS(text, 500);
      console.log(
        "Web Speech - Cleaned text:",
        cleanText.substring(0, 100) + "...",
      );

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = customLang || lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const availableVoices = window.speechSynthesis.getVoices();
      const langPrefix = targetLang.split("-")[0];
      let voice = availableVoices.find((v) => v.lang.startsWith(targetLang));

      if (!voice) {
        voice = availableVoices.find((v) => v.lang.startsWith(langPrefix));
      }

      if (!voice) {
        voice = availableVoices.find((v) => v.lang.startsWith("en"));
      }

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
        console.log(`Using voice: ${voice.name} (${voice.lang})`);
      } else {
        utterance.lang = targetLang;
        console.warn("No voice selected, using browser default");
      }

      utterance.onstart = () => {
        console.log("✓ Web Speech started");
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log("✓ Web Speech ended");
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("✗ Web Speech error:", event.error);
        setError(event.error);
        setIsSpeaking(false);
      };

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      console.log("→ Web Speech queued, text length:", cleanText.length);

      setTimeout(() => {
        window.speechSynthesis.resume();
        console.log("→ Forced resume after queueing");
      }, 100);
    },
    [lang, rate, pitch, volume],
  );

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isLoading: false, // Web Speech doesn't have loading state
    isSupported,
    error,
    voices,
  };
}
