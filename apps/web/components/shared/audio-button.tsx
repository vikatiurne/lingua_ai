"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AudioButtonProps = {
  text: string;
  lang?: string;
  className?: string;
};

function cleanTextForSpeech(text: string): string {
  return text.replace(/\.\.\./g, " ").replace(/\s+/g, " ").trim();
}

export function AudioButton({ text, lang = "en-US", className }: AudioButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || typeof window === "undefined") return;

    const handleEnd = () => setIsSpeaking(false);
    window.speechSynthesis.addEventListener("end", handleEnd);
    window.speechSynthesis.addEventListener("error", handleEnd);

    return () => {
      window.speechSynthesis.removeEventListener("end", handleEnd);
      window.speechSynthesis.removeEventListener("error", handleEnd);
    };
  }, [isSupported]);

  if (!isSupported) return null;

  const cleanedText = cleanTextForSpeech(text);
  if (cleanedText.length === 0) return null;

  function handleClick() {
    if (typeof window === "undefined") return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = lang;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn("h-7 w-7 shrink-0", className)}
      aria-label={isSpeaking ? "Зупинити озвучку" : "Прослухати вимову"}
    >
      {isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
