export type Status = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Hidden stage-direction turns (topic kickoffs) are sent to the API but never rendered. */
  hidden?: boolean;
}
