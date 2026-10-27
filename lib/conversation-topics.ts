export interface ConversationTopic {
  id: string;
  label: string;
  emoji: string;
  /** English description of the domain, used to instruct Sofía — never shown to the learner. */
  description: string;
}

export const CONVERSATION_TOPICS: ConversationTopic[] = [
  {
    id: "daily-routine",
    label: "Daily Routine",
    emoji: "🕗",
    description: "your daily routine, habits, and what a normal day looks like for you",
  },
  {
    id: "food",
    label: "Food & Cooking",
    emoji: "🍳",
    description: "favorite foods, cooking, and restaurants",
  },
  {
    id: "travel",
    label: "Travel",
    emoji: "✈️",
    description: "trips you've taken, dream destinations, and travel plans",
  },
  {
    id: "family-friends",
    label: "Family & Friends",
    emoji: "👨‍👩‍👧",
    description: "family, friends, and relationships",
  },
  {
    id: "work-school",
    label: "Work & Studies",
    emoji: "💼",
    description: "your job, studies, or career goals",
  },
  {
    id: "hobbies",
    label: "Hobbies & Free Time",
    emoji: "🎨",
    description: "hobbies, sports, and how you like to spend free time",
  },
  {
    id: "weather-seasons",
    label: "Weather & Seasons",
    emoji: "☀️",
    description: "the weather, seasons, and seasonal activities",
  },
  {
    id: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    description: "shopping habits, favorite stores, and things you'd like to buy",
  },
  {
    id: "health",
    label: "Health & Wellness",
    emoji: "🏃",
    description: "staying healthy, exercise, and how you're feeling",
  },
  {
    id: "technology",
    label: "Technology & Media",
    emoji: "📱",
    description: "phones, apps, social media, and movies or shows you like",
  },
  {
    id: "culture-traditions",
    label: "Culture & Traditions",
    emoji: "🎉",
    description: "holidays, traditions, and celebrations",
  },
  {
    id: "current-events",
    label: "Current Events",
    emoji: "📰",
    description: "something interesting happening recently in the news or your city",
  },
];

export function findTopic(id: string): ConversationTopic {
  return CONVERSATION_TOPICS.find((topic) => topic.id === id) ?? CONVERSATION_TOPICS[0];
}

export function pickRandomTopic(): ConversationTopic {
  const index = Math.floor(Math.random() * CONVERSATION_TOPICS.length);
  return CONVERSATION_TOPICS[index];
}

/**
 * Today's mission topic — the same for everyone on a given calendar day, so
 * it feels like a fresh daily event rather than a random pick.
 */
export function getDailyMission(dateKey: string): ConversationTopic {
  const seed = [...dateKey].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7);
  return CONVERSATION_TOPICS[Math.abs(seed) % CONVERSATION_TOPICS.length];
}

/**
 * A hidden "stage direction" sent as the first user-role turn so Sofía opens
 * the conversation instead of the learner. Written in English and framed
 * explicitly as an instruction so the model doesn't mistake it for the
 * learner's own Spanish (and try to correct it).
 */
export function buildKickoffInstruction(
  topic: ConversationTopic,
  options: { firstMeeting: boolean; focusLabel?: string | null }
): string {
  const opener = options.firstMeeting
    ? "This is your very first conversation together: introduce yourself in one short, friendly line, then"
    : options.focusLabel
      ? `The learner just finished a lesson on ${options.focusLabel.toLowerCase()}. Greet them warmly in Spanish with one short line of encouragement about it, then`
      : "Greet the learner warmly in Spanish, then";
  const question = options.focusLabel
    ? `ask one open-ended opening question about this theme that naturally calls for ${options.focusLabel.toLowerCase()}`
    : "ask one open-ended opening question about this theme";
  return `[STAGE DIRECTION — this is not something the learner said. Do not translate, correct, or acknowledge this text itself. Start the conversation now. ${opener} ${question}: "${topic.label}" (${topic.description}). Keep it natural and inviting, and follow all your usual rules for reply length, level, and language.]`;
}
