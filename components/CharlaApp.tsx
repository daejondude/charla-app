"use client";

import { useEffect, useRef, useState } from "react";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import {
  buildKickoffInstruction,
  getDailyMission,
  pickRandomTopic,
  type ConversationTopic,
} from "@/lib/conversation-topics";
import type { ChatMessage, Status } from "@/lib/chat-types";
import {
  awardTurn,
  completeSession,
  dateKey,
  loadProgress,
  saveProgress,
  type Progress,
  type RewardEvent,
} from "@/lib/progress";
import {
  fallbackSummaryNote,
  homeGreeting,
  rewardLabel,
  summaryHeadline,
  type SofiaLine,
} from "@/lib/sofia-lines";
import { HomeScreen } from "@/components/HomeScreen";
import { LevelSelectScreen } from "@/components/LevelSelectScreen";
import { TopicSelectScreen } from "@/components/TopicSelectScreen";
import { ChatScreen, type RewardFlash } from "@/components/ChatScreen";
import { SummaryScreen, type SessionSummary } from "@/components/SummaryScreen";

const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

const REWARD_FLASH_MS = 2200;

type Screen = "home" | "level" | "topics" | "chat" | "summary";

/** Which reward to announce when one turn earns several — biggest news wins. */
const REWARD_PRIORITY: RewardEvent["kind"][] = ["goal", "freeze", "streak", "lucky", "long"];

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

interface SessionTally {
  turns: number;
  turnXp: number;
  streakExtended: boolean;
  goalHit: boolean;
}

const EMPTY_TALLY: SessionTally = { turns: 0, turnXp: 0, streakExtended: false, goalHit: false };

/** Rendered client-only (see app/page.tsx), so it can read localStorage up front. */
export function CharlaApp() {
  const [initial] = useState(() => {
    const { progress: loaded, notice } = loadProgress();
    saveProgress(loaded);
    return { progress: loaded, greeting: homeGreeting(loaded, notice, new Date().getHours()) };
  });
  const [screen, setScreen] = useState<Screen>("home");
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [greeting, setGreeting] = useState<SofiaLine>(initial.greeting);
  const [topic, setTopic] = useState<ConversationTopic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [reward, setReward] = useState<RewardFlash | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [summaryNote, setSummaryNote] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Source of truth for conversation history. Async chains (record ->
  // transcribe -> converse -> speak) run through closures created on
  // earlier renders, so reading `messages` state inside them returns stale
  // data. A ref is mutated in place and always reflects the latest history.
  const messagesRef = useRef<ChatMessage[]>([]);
  // Same reasoning for progress: the level and streak must be current inside
  // those async chains, not whatever the closure captured.
  const progressRef = useRef<Progress>(initial.progress);
  const sessionTallyRef = useRef<SessionTally>(EMPTY_TALLY);
  // The topic picked before a level existed — onboarding starts it right
  // after the learner chooses a level.
  const pendingTopicRef = useRef<ConversationTopic | null>(null);
  const rewardIdRef = useRef(0);
  // Random ID generated once per page load, sent with every /api/converse
  // and /api/transcribe request so their Supabase logs can be grouped by
  // conversation.
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current && typeof window !== "undefined") {
    sessionIdRef.current = crypto.randomUUID();
  }
  // Bumped whenever the current conversation is torn down (pause, finish,
  // leaving the chat). Every async step in the record -> transcribe ->
  // converse -> speak chain captures the token active when it started and
  // checks it again after each await; a mismatch means the user has since
  // paused or navigated away, so the chain aborts instead of mutating state.
  const sessionTokenRef = useRef(0);

  function commitProgress(next: Progress) {
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }

  function refreshGreeting(current: Progress) {
    setGreeting(homeGreeting(current, null, new Date().getHours()));
  }

  function appendMessage(message: ChatMessage): ChatMessage[] {
    const updated = [...messagesRef.current, message];
    messagesRef.current = updated;
    setMessages(updated);
    return updated;
  }

  // Prime the voice list — Chrome loads voices asynchronously.
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!reward) return;
    const timeout = setTimeout(() => setReward(null), REWARD_FLASH_MS);
    return () => clearTimeout(timeout);
  }, [reward]);

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

  function teardownConversation() {
    sessionTokenRef.current += 1;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopMediaAndSpeech();
    messagesRef.current = [];
    setMessages([]);
    setStatus("idle");
    setError(null);
    setReward(null);
  }

  function goHome() {
    if (progressRef.current) refreshGreeting(progressRef.current);
    setScreen("home");
  }

  function handleTogglePause() {
    if (status === "paused") {
      setStatus("idle");
      return;
    }
    sessionTokenRef.current += 1;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopMediaAndSpeech();
    setStatus("paused");
    setError(null);
  }

  function handleLevelSelect(level: SpanishLevel) {
    if (!progressRef.current) return;
    commitProgress({ ...progressRef.current, level });
    const pending = pendingTopicRef.current;
    pendingTopicRef.current = null;
    if (pending) void startConversation(pending);
    else goHome();
  }

  async function startConversation(selectedTopic: ConversationTopic) {
    const current = progressRef.current;
    if (!current) return;
    if (!current.level) {
      // First run: the one-tap path detours through level choice once.
      pendingTopicRef.current = selectedTopic;
      setScreen("level");
      return;
    }

    teardownConversation();
    sessionTallyRef.current = { ...EMPTY_TALLY };
    setSessionXp(0);
    setTopic(selectedTopic);
    setScreen("chat");

    const token = sessionTokenRef.current;
    const kickoff: ChatMessage = {
      role: "user",
      content: buildKickoffInstruction(selectedTopic, {
        firstMeeting: current.sessionsCompleted === 0 && current.xp === 0,
      }),
      hidden: true,
    };
    const updatedHistory = appendMessage(kickoff);
    await requestSofiaReply(updatedHistory, token);
  }

  /** Banks XP and streak for a learner turn, and flashes the reward. */
  function recordTurn(mode: "voice" | "text", text: string) {
    const current = progressRef.current;
    if (!current) return;
    const { progress: next, gained, events } = awardTurn(current, { mode, text });
    commitProgress(next);

    const tally = sessionTallyRef.current;
    sessionTallyRef.current = {
      turns: tally.turns + 1,
      turnXp: tally.turnXp + gained,
      streakExtended: tally.streakExtended || events.some((event) => event.kind === "streak"),
      goalHit: tally.goalHit || events.some((event) => event.kind === "goal"),
    };
    setSessionXp(sessionTallyRef.current.turnXp);

    const headline = REWARD_PRIORITY.find((kind) => events.some((event) => event.kind === kind));
    rewardIdRef.current += 1;
    setReward({ id: rewardIdRef.current, xp: gained, label: headline ? rewardLabel(headline) : null });
  }

  function finishConversation() {
    const current = progressRef.current;
    const tally = sessionTallyRef.current;
    const history = messagesRef.current
      .filter((message) => !message.hidden)
      .map(({ role, content }) => ({ role, content }));
    teardownConversation();

    if (!current || tally.turns === 0 || !topic) {
      goHome();
      return;
    }

    const isFirstSession = current.sessionsCompleted === 0;
    const { progress: next, bonuses } = completeSession(current, {
      turns: tally.turns,
      wasDailyMission: topic.id === getDailyMission(dateKey()).id,
    });
    commitProgress(next);
    setSummary({
      ...tally,
      bonuses,
      isFirstSession,
      headline: summaryHeadline(tally.turns, isFirstSession),
    });
    setSummaryNote(null);
    setScreen("summary");
    void loadSummaryNote(history, next.level, tally.turns);
  }

  async function loadSummaryNote(
    history: { role: ChatMessage["role"]; content: string }[],
    level: SpanishLevel | null,
    turns: number
  ) {
    const token = sessionTokenRef.current;
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, level }),
      });
      const data = await res.json();
      if (sessionTokenRef.current !== token) return;
      setSummaryNote(res.ok && typeof data.note === "string" ? data.note : fallbackSummaryNote(turns));
    } catch {
      if (sessionTokenRef.current !== token) return;
      setSummaryNote(fallbackSummaryNote(turns));
    }
  }

  function handleSendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Blocked only while audio is actually being captured/processed for a
    // voice turn — typing is allowed while idle, paused, or while Sofia is
    // thinking/speaking, in which case this interrupts her: bumping the
    // token invalidates whatever's in flight (a pending converse reply
    // won't be appended or spoken), and canceling speech stops her mid-
    // sentence if she's talking.
    if (status === "recording" || status === "transcribing") return;
    sessionTokenRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setError(null);

    const token = sessionTokenRef.current;
    const updatedHistory = appendMessage({ role: "user", content: trimmed });
    recordTurn("text", trimmed);
    void requestSofiaReply(updatedHistory, token);
  }

  async function startRecording() {
    const token = sessionTokenRef.current;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (sessionTokenRef.current !== token) {
        // Paused or navigated away while waiting on the permission prompt —
        // release the mic we just acquired instead of using it.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
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
        if (sessionTokenRef.current !== token) return; // paused — discard
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        void handleRecordingComplete(blob, token);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch (err) {
      if (sessionTokenRef.current !== token) return;
      console.error("Microphone access failed:", err);
      let message = "Couldn't access the microphone. Please try again.";
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        message = "This browser doesn't support microphone access — try typing instead, or use a different browser.";
      } else if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          message = "Microphone access was denied. Check your browser's site permissions and try again.";
        } else if (err.name === "NotFoundError") {
          message = "No microphone was found. Check that one is connected, or try typing instead.";
        }
      }
      setError(message);
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

  async function handleRecordingComplete(blob: Blob, token: number) {
    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("level", progressRef.current?.level ?? "");
      form.append("sessionId", sessionIdRef.current);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (sessionTokenRef.current !== token) return; // paused — ignore result

      if (!res.ok) throw new Error(data.error ?? "Transcription failed.");

      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!text) {
        setError("Didn't catch that — try again, a little closer to the mic.");
        setStatus("idle");
        return;
      }

      const updatedHistory = appendMessage({ role: "user", content: text });
      recordTurn("voice", text);
      await requestSofiaReply(updatedHistory, token);
    } catch (err) {
      if (sessionTokenRef.current !== token) return;
      console.error("Transcription error:", err);
      // fetch() throws a browser-native TypeError (with a cryptic message
      // like "Failed to fetch") when the request never reached the server
      // at all — offline, DNS failure, etc. Our own thrown Error carries the
      // server's already-sanitized message, so only TypeError needs rewording.
      const message =
        err instanceof TypeError
          ? "Network error — check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong transcribing your audio.";
      setError(message);
      setStatus("idle");
    }
  }

  async function requestSofiaReply(history: ChatMessage[], token: number) {
    const level = progressRef.current?.level;
    if (!level) return;
    setStatus("thinking");
    try {
      const res = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: history.map(({ role, content }) => ({ role, content })),
          level,
          sessionId: sessionIdRef.current,
        }),
      });
      const data = await res.json();
      if (sessionTokenRef.current !== token) return; // paused — ignore result

      if (!res.ok) throw new Error(data.error ?? "Sofía couldn't respond.");

      const reply: string = data.reply;
      appendMessage({ role: "assistant", content: reply });
      speak(reply, token);
    } catch (err) {
      if (sessionTokenRef.current !== token) return;
      console.error("Converse error:", err);
      const message =
        err instanceof TypeError
          ? "Network error — check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong reaching Sofía.";
      setError(message);
      setStatus("idle");
    }
  }

  function speak(text: string, token: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Voice playback isn't supported in this browser — showing text only.");
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
    utterance.onend = () => {
      if (sessionTokenRef.current !== token) return; // paused — leave the mic off
      setStatus("idle");
    };
    utterance.onerror = () => {
      if (sessionTokenRef.current !== token) return;
      setStatus("idle");
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const mission = getDailyMission(progress.todayDate);

  if (screen === "level") {
    return (
      <LevelSelectScreen
        current={progress.level}
        onSelect={handleLevelSelect}
        onBack={() => {
          pendingTopicRef.current = null;
          goHome();
        }}
      />
    );
  }

  if (screen === "topics") {
    return (
      <TopicSelectScreen
        mission={mission}
        onBack={goHome}
        onSelect={(selected) => void startConversation(selected)}
      />
    );
  }

  if (screen === "summary" && summary) {
    return (
      <SummaryScreen
        summary={summary}
        progress={progress}
        note={summaryNote}
        onKeepTalking={() => {
          let next = pickRandomTopic();
          while (topic && next.id === topic.id) next = pickRandomTopic();
          void startConversation(next);
        }}
        onDone={goHome}
      />
    );
  }

  if (screen === "chat" && topic && progress.level) {
    const isRecordButtonDisabled = status !== "idle" && status !== "recording";
    return (
      <ChatScreen
        level={progress.level}
        topic={topic}
        messages={messages.filter((message) => !message.hidden)}
        status={status}
        error={error}
        sessionXp={sessionXp}
        todayTurns={progress.todayTurns}
        goalTurns={progress.goalTurns}
        reward={reward}
        isRecordButtonDisabled={isRecordButtonDisabled}
        onRecordButtonClick={handleRecordButtonClick}
        onSendText={handleSendText}
        onTogglePause={handleTogglePause}
        onFinish={finishConversation}
        messagesEndRef={messagesEndRef}
      />
    );
  }

  return (
    <HomeScreen
      progress={progress}
      greeting={greeting}
      mission={mission}
      onStartMission={() => void startConversation(mission)}
      onPickTopic={() => setScreen("topics")}
      onChangeLevel={() => setScreen("level")}
    />
  );
}
