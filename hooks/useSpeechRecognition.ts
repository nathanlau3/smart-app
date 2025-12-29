"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  lang?: string;
  continuous?: boolean;
  handleFinish?: () => void;
  silenceTimeout?: number;
}

export function useSpeechRecognition({
  onResult,
  onError,
  lang = "id-ID",
  continuous = false,
  handleFinish,
  silenceTimeout = 2000,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const handleFinishRef = useRef(handleFinish);
  const silenceTimeoutRef = useRef(silenceTimeout);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    handleFinishRef.current = handleFinish;
    silenceTimeoutRef.current = silenceTimeout;
  }, [onResult, onError, handleFinish, silenceTimeout]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    const timeout = silenceTimeoutRef.current;
    if (!timeout || timeout <= 0) return;

    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (hasSpokenRef.current && fullTranscriptRef.current.trim().length > 0) {
        console.log("Silence detected, auto-submitting...");
        if (recognitionRef.current && isListeningRef.current) {
          recognitionRef.current.stop();
        }
      }
    }, timeout);
  }, [clearSilenceTimer]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      onErrorRef.current?.(
        "Speech recognition is not supported in this browser",
      );
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += result;
        } else {
          interimTranscript += result;
        }
      }

      if (finalTranscript || interimTranscript) {
        hasSpokenRef.current = true;
        clearSilenceTimer();
      }

      if (finalTranscript && continuous) {
        fullTranscriptRef.current +=
          (fullTranscriptRef.current ? " " : "") + finalTranscript;
        const fullText =
          fullTranscriptRef.current +
          (interimTranscript ? " " + interimTranscript : "");
        setTranscript(fullText);
        onResultRef.current?.(fullText);

        startSilenceTimer();
      } else if (!continuous) {
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        if (finalTranscript) {
          onResultRef.current?.(finalTranscript);
        }
      } else if (interimTranscript) {
        const fullText =
          fullTranscriptRef.current +
          (interimTranscript ? " " + interimTranscript : "");
        setTranscript(fullText);
        onResultRef.current?.(fullText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      clearSilenceTimer();
      setIsListening(false);
      isListeningRef.current = false;
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (hasSpokenRef.current && fullTranscriptRef.current.trim().length > 0) {
        handleFinishRef.current?.();
      }
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [lang, continuous, clearSilenceTimer, startSilenceTimer]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      setTranscript("");
      fullTranscriptRef.current = "";
      hasSpokenRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      clearSilenceTimer();
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [clearSilenceTimer]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
