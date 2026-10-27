import type { Progress, RewardKind, StreakNotice } from "./progress";

/** A line Sofía says, with an English gloss for learners who need it. */
export interface SofiaLine {
  es: string;
  en: string;
}

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

/** What Sofía says on the home screen, reacting to the learner's situation. */
export function homeGreeting(
  progress: Progress,
  notice: StreakNotice,
  hour: number
): SofiaLine {
  if (progress.sessionsCompleted === 0 && progress.todayTurns === 0) {
    return pick([
      { es: "¡Hola! Soy Sofía. ¿Charlamos un ratito?", en: "Hi! I'm Sofía. Want to chat for a bit?" },
      { es: "¡Hola! Soy Sofía. Prometo no hablar muy rápido.", en: "Hi! I'm Sofía. I promise not to talk too fast." },
    ]);
  }
  if (notice === "freeze-used") {
    return { es: "Te guardé la racha. De nada. 😉", en: "I saved your streak. You're welcome." };
  }
  if (notice === "streak-lost") {
    return pick([
      { es: "¡Volviste! Empezamos de nuevo, sin drama.", en: "You're back! Fresh start, no drama." },
      { es: "Te extrañé. ¿Retomamos hoy?", en: "I missed you. Pick it back up today?" },
    ]);
  }
  if (progress.todayTurns >= progress.goalTurns) {
    return pick([
      { es: "Meta cumplida. ¿Una más, por gusto?", en: "Goal done. One more, just for fun?" },
      { es: "Hoy ya brillaste. ¿Seguimos?", en: "You already shined today. Keep going?" },
    ]);
  }
  if (progress.todayTurns > 0) {
    return { es: "¡Ya casi! Nos faltan unas frases.", en: "Almost there! Just a few more lines." };
  }
  if (progress.streak >= 3) {
    return pick([
      { es: `¡${progress.streak} días seguidos! No me vas a dejar hoy, ¿verdad?`, en: `${progress.streak} days in a row! You won't leave me hanging today, right?` },
      { es: `Racha de ${progress.streak} días. Qué disciplina, eh.`, en: `${progress.streak}-day streak. Look at that discipline.` },
    ]);
  }
  if (hour < 12) {
    return pick([
      { es: "¡Buenos días! ¿Un cafecito y charlamos?", en: "Good morning! Coffee and a chat?" },
      { es: "¡Buenos días! Cuéntame algo antes del desayuno.", en: "Good morning! Tell me something before breakfast." },
    ]);
  }
  if (hour < 19) {
    return pick([
      { es: "¡Buenas tardes! Tengo cinco minutos y mucha curiosidad.", en: "Good afternoon! I've got five minutes and lots of curiosity." },
      { es: "¿Qué tal tu día? Quiero todos los detalles.", en: "How's your day? I want all the details." },
    ]);
  }
  return pick([
    { es: "¡Buenas noches! ¿Una charla antes de dormir?", en: "Good evening! A quick chat before bed?" },
    { es: "La noche es joven. ¿Hablamos?", en: "The night is young. Shall we talk?" },
  ]);
}

export function rewardLabel(kind: RewardKind): string {
  switch (kind) {
    case "lucky":
      return pick(["¡Bonus! Double XP", "¡Suerte! Double XP", "¡Olé! Double XP"]);
    case "long":
      return "Long sentence bonus";
    case "streak":
      return "Streak extended";
    case "goal":
      return "¡Meta cumplida! Daily goal done";
    case "freeze":
      return "You earned a streak freeze";
  }
}

export function summaryHeadline(turns: number, isFirstSession: boolean): string {
  if (isFirstSession) return "Your first conversation in Spanish!";
  if (turns >= 10) return pick(["¡Qué conversación!", "You were on fire"]);
  if (turns >= 5) return pick(["¡Eso estuvo genial!", "Great chat"]);
  return pick(["¡Bien hecho!", "Every sentence counts"]);
}

/** Used when the personalized note can't be generated. */
export function fallbackSummaryNote(turns: number): string {
  if (turns <= 1) {
    return "Short and sweet — and showing up is the hard part. Mañana hablamos más. ¡Hasta pronto!";
  }
  return `You kept the conversation going for ${turns} turns, and that's exactly how fluency is built. Try one longer sentence next time. ¡Hasta mañana!`;
}
