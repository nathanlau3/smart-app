"use client";

import { useEffect, useState, useCallback } from "react";

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechSynthesis({
  lang = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
}: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!window.speechSynthesis) {
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
        console.error("Speech synthesis not supported");
        return;
      }

      window.speechSynthesis.cancel();

      let cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const MAX_LENGTH = 500;
      if (cleanText.length > MAX_LENGTH) {
        cleanText = cleanText.substring(0, MAX_LENGTH) + '...';
        console.warn(`Text truncated from ${text.length} to ${MAX_LENGTH} characters for speech synthesis`);
      }

      console.log("Cleaned text for speech:", cleanText.substring(0, 100) + "...");

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
        console.log("✓ Speech started");
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log("✓ Speech ended");
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("✗ Speech synthesis error:", event.error);
        setIsSpeaking(false);
      };

      window.speechSynthesis.resume();

      window.speechSynthesis.speak(utterance);
      console.log("→ Speech queued, text length:", cleanText.length);

      setTimeout(() => {
        window.speechSynthesis.resume();
        console.log("→ Forced resume after queueing");
      }, 100);
    },
    [lang, rate, pitch, volume]
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
    isSupported,
    voices,
  };
}
