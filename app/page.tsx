"use client";

import { useEffect, useRef, useState } from "react";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import {
  buildKickoffInstruction,
  type ConversationTopic,
} from "@/lib/conversation-topics";
import type { ChatMessage, Status } from "@/lib/chat-types";
import { LevelSelectScreen } from "@/components/LevelSelectScreen";
import { TopicSelectScreen } from "@/components/TopicSelectScreen";
import { ChatScreen } from "@/components/ChatScreen";

const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return RECORDER_MIME_CANDIDATES.find((candidate) =>
    MediaRecorder.isTypeSupported?.(candidate)
  );
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "es-es") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ??
    null
  );
}

export default function Home() {
  const [level, setLevel] = useState<SpanishLevel | null>(null);
  const [topic, setTopic] = useState<ConversationTopic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Source of truth for conversation history. The auto-restart loop
  // (speak -> onend -> startRecording -> ... -> handleRecordingComplete)
  // chains through closures created on earlier renders, so reading the
  // `messages` state variable inside those closures returns stale data.
  // A ref is mutated in place and always reflects the latest history
  // regardless of which render's closure is reading it.
  const messagesRef = useRef<ChatMessage[]>([]);

  function appendMessage(message: ChatMessage): ChatMessage[] {
    const updated = [...messagesRef.current, message];
    messagesRef.current = updated;
    setMessages(updated);
    return updated;
  }

  // Prime the voice list — Chrome loads voices asynchronously.
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop any in-flight mic stream / speech on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopMediaAndSpeech() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function resetToLevelSelect() {
    stopMediaAndSpeech();
    setLevel(null);
    setTopic(null);
    messagesRef.current = [];
    setMessages([]);
    setStatus("idle");
    setError(null);
  }

  function resetToTopicSelect() {
    stopMediaAndSpeech();
    setTopic(null);
    messagesRef.current = [];
    setMessages([]);
    setStatus("idle");
    setError(null);
  }

  async function startConversation(selectedTopic: ConversationTopic) {
    setTopic(selectedTopic);
    const kickoff: ChatMessage = {
      role: "user",
      content: buildKickoffInstruction(selectedTopic),
      hidden: true,
    };
    const updatedHistory = appendMessage(kickoff);
    await requestSofiaReply(updatedHistory);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        void handleRecordingComplete(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access failed:", err);
      setError("Couldn't access the microphone. Check your browser permissions.");
      setStatus("idle");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function handleRecordButtonClick() {
    if (status === "idle") void startRecording();
    else if (status === "recording") stopRecording();
  }

  async function handleRecordingComplete(blob: Blob) {
    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed.");

      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!text) {
        setError("Didn't catch that — try again.");
        setStatus("idle");
        return;
      }

      const updatedHistory = appendMessage({ role: "user", content: text });
      await requestSofiaReply(updatedHistory);
    } catch (err) {
      console.error("Transcription error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong transcribing your audio."
      );
      setStatus("idle");
    }
  }

  async function requestSofiaReply(history: ChatMessage[]) {
    if (!level) return;
    setStatus("thinking");
    try {
      const res = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: history.map(({ role, content }) => ({ role, content })),
          level,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sofía couldn't respond.");

      const reply: string = data.reply;
      appendMessage({ role: "assistant", content: reply });
      speak(reply);
    } catch (err) {
      console.error("Converse error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong reaching Sofía."
      );
      setStatus("idle");
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("idle");
      return;
    }
    setStatus("speaking");
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickSpanishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "es-ES";
    }
    utterance.onend = () => void startRecording();
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  if (!level) {
    return <LevelSelectScreen onSelect={setLevel} />;
  }

  if (!topic) {
    return (
      <TopicSelectScreen
        level={level}
        onBack={resetToLevelSelect}
        onSelect={(selected) => void startConversation(selected)}
      />
    );
  }

  const isRecordButtonDisabled = status !== "idle" && status !== "recording";
  const visibleMessages = messages.filter((message) => !message.hidden);

  return (
    <ChatScreen
      level={level}
      topic={topic}
      messages={visibleMessages}
      status={status}
      error={error}
      isRecordButtonDisabled={isRecordButtonDisabled}
      onRecordButtonClick={handleRecordButtonClick}
      onNewTopic={resetToTopicSelect}
      onChangeLevel={resetToLevelSelect}
      messagesEndRef={messagesEndRef}
    />
  );
}
