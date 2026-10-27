import type { SkillId } from "./skills";

/**
 * Lesson templates. Authored rather than generated so every lesson is
 * instant, free, and reliably correct; the player personalizes them at
 * runtime (the learner's own mistake in the intro, explanation language by
 * level, shuffled drills) and Sofía's follow-up conversation supplies the
 * open-ended practice.
 */

export interface Phrase {
  es: string;
  en: string;
}

export interface LessonRule {
  name: string;
  /** Explanation for Beginner/Intermediate learners. */
  en: string;
  /** Explanation in simple Spanish for Advanced learners. */
  es: string;
  example: Phrase;
}

export interface LessonContrast {
  wrong: string;
  right: string;
  why: string;
}

export interface LessonDrill {
  /** Spanish sentence with "___" marking the gap. */
  prompt: string;
  /** English meaning, so the drill tests grammar, not vocabulary. */
  hint: string;
  options: string[];
  answer: string;
  why: string;
}

export interface Lesson {
  skill: SkillId;
  title: string;
  /** Sofía's opener when there's no personal mistake to quote. */
  hook: Phrase;
  rules: LessonRule[];
  examples: Phrase[];
  contrasts: LessonContrast[];
  drills: LessonDrill[];
  /** Sofía's send-off after the drills, before the speaking practice. */
  wrap: Phrase;
}

export const LESSONS: Record<SkillId, Lesson> = {
  "past-tense": {
    skill: "past-tense",
    title: "Talking about the past",
    hook: {
      es: "¡Vamos a hablar del pasado!",
      en: "Yesterday, last weekend, that trip — let's unlock all of it.",
    },
    rules: [
      {
        name: "Finished actions use the preterite",
        en: "When something happened and finished — yesterday, last week, once — use the preterite. Words like ayer, anoche, el sábado and la semana pasada are your signal.",
        es: "Para acciones terminadas en el pasado usamos el pretérito. Palabras como ayer, anoche o la semana pasada son la señal.",
        example: { es: "Ayer comí tacos.", en: "Yesterday I ate tacos." },
      },
      {
        name: "Regular endings",
        en: "-ar verbs: -é, -aste, -ó (hablé, hablaste, habló). -er/-ir verbs: -í, -iste, -ió (comí, viviste, salió). Watch the accent — hablo is “I speak”, habló is “he spoke”.",
        es: "Verbos en -ar: -é, -aste, -ó. Verbos en -er/-ir: -í, -iste, -ió. ¡Ojo con el acento! Hablo es presente; habló es pasado.",
        example: { es: "Mi hermana habló con el chef.", en: "My sister talked to the chef." },
      },
      {
        name: "The irregular all-stars",
        en: "The most common verbs are irregular — learn these by heart: fui (I went / I was), tuve (I had), hice (I did/made), estuve (I was), pude (I could).",
        es: "Los verbos más comunes son irregulares: fui, tuve, hice, estuve, pude. ¡Vale la pena memorizarlos!",
        example: { es: "El sábado fui a la playa.", en: "On Saturday I went to the beach." },
      },
    ],
    examples: [
      { es: "Anoche vi una película muy buena.", en: "Last night I saw a really good movie." },
      { es: "¿Qué hiciste el fin de semana?", en: "What did you do on the weekend?" },
      { es: "Tuve un día largo en el trabajo.", en: "I had a long day at work." },
      { es: "Mis amigos llegaron tarde.", en: "My friends arrived late." },
    ],
    contrasts: [
      { wrong: "Ayer yo ir al mercado.", right: "Ayer fui al mercado.", why: "Never leave the verb as an infinitive — ir becomes fui." },
      { wrong: "Ayer como pizza.", right: "Ayer comí pizza.", why: "“Ayer” means it's finished, so como (present) becomes comí." },
      { wrong: "Yo tení un problema.", right: "Yo tuve un problema.", why: "Tener is irregular in the past: tuve, not tení." },
    ],
    drills: [
      { prompt: "Ayer ___ al cine con mi novia.", hint: "Yesterday I went to the cinema with my girlfriend.", options: ["voy", "fui", "ir"], answer: "fui", why: "Ir in the past is fui." },
      { prompt: "Anoche ___ una pizza enorme.", hint: "Last night I ate a huge pizza.", options: ["comí", "como", "comé"], answer: "comí", why: "-er verbs end in -í for “I” in the preterite." },
      { prompt: "¿Qué ___ tú el sábado?", hint: "What did you do on Saturday?", options: ["haces", "hiciste", "haciste"], answer: "hiciste", why: "Hacer is irregular: hice, hiciste, hizo." },
      { prompt: "Mi madre ___ con el doctor.", hint: "My mother spoke with the doctor.", options: ["habló", "hablo", "hablé"], answer: "habló", why: "Habló (with the accent) is “she spoke”; hablo is “I speak”." },
      { prompt: "El año pasado ___ que trabajar mucho.", hint: "Last year I had to work a lot.", options: ["tengo", "tení", "tuve"], answer: "tuve", why: "Tener is irregular: tuve." },
      { prompt: "Nosotros ___ en Madrid tres días.", hint: "We were in Madrid for three days.", options: ["estuvimos", "estamos", "estábamos"], answer: "estuvimos", why: "A finished stay with a set length takes the preterite: estuvimos." },
      { prompt: "Ellos ___ muy tarde a la fiesta.", hint: "They arrived very late to the party.", options: ["llegan", "llegaron", "llegó"], answer: "llegaron", why: "-ar verbs end in -aron for “they”." },
      { prompt: "Esta mañana ___ un café en casa.", hint: "This morning I made a coffee at home.", options: ["hice", "hago", "hací"], answer: "hice", why: "This morning is already over, so: hice." },
    ],
    wrap: {
      es: "¡Ya puedes contarme tus historias!",
      en: "Now let's use it for real — tell me about your past trips.",
    },
  },

  "por-para": {
    skill: "por-para",
    title: "Por vs para",
    hook: {
      es: "Por y para: los gemelos traviesos.",
      en: "Both can mean “for” — here's the trick to tell them apart.",
    },
    rules: [
      {
        name: "Para points forward → to a goal",
        en: "Para looks ahead to a goal: a purpose (para aprender), a recipient (para ti), a destination (para Madrid), or a deadline (para el lunes).",
        es: "Para mira hacia una meta: propósito, destinatario, destino o fecha límite.",
        example: { es: "Estudio español para viajar.", en: "I study Spanish (in order) to travel." },
      },
      {
        name: "Por looks back → at a cause or a route",
        en: "Por explains the cause or the path: a reason (por la lluvia), an exchange or price (por diez euros), a duration (por dos horas), a route (por el parque), a means (por teléfono) — and thanks (gracias por).",
        es: "Por explica la causa o el camino: razón, precio, duración, lugar por donde pasas, medio — y gracias por.",
        example: { es: "Gracias por la ayuda.", en: "Thanks for the help." },
      },
      {
        name: "The quick test",
        en: "Can you swap in “in order to” or “intended for”? Use para. Is it “because of”, “in exchange for”, or “through”? Use por.",
        es: "Si significa “con el objetivo de” → para. Si significa “a causa de” o “a cambio de” → por.",
        example: { es: "Este regalo es para ti. Lo compré por veinte euros.", en: "This gift is for you. I bought it for twenty euros." },
      },
    ],
    examples: [
      { es: "Salgo para el aeropuerto a las seis.", en: "I leave for the airport at six." },
      { es: "Caminamos por la playa.", en: "We walked along the beach." },
      { es: "No fui por el tráfico.", en: "I didn't go because of the traffic." },
      { es: "Necesito el informe para mañana.", en: "I need the report by tomorrow." },
    ],
    contrasts: [
      { wrong: "Gracias para todo.", right: "Gracias por todo.", why: "Thanks always takes por." },
      { wrong: "Estudio por ser doctora.", right: "Estudio para ser doctora.", why: "A goal (“in order to”) takes para." },
      { wrong: "Lo compré para diez euros.", right: "Lo compré por diez euros.", why: "Prices and exchanges take por." },
    ],
    drills: [
      { prompt: "Este café es ___ ti.", hint: "This coffee is for you.", options: ["por", "para"], answer: "para", why: "A recipient takes para." },
      { prompt: "Gracias ___ venir.", hint: "Thanks for coming.", options: ["por", "para"], answer: "por", why: "Gracias por — always." },
      { prompt: "Trabajo ___ ganar dinero.", hint: "I work (in order) to earn money.", options: ["por", "para"], answer: "para", why: "Purpose (“in order to”) takes para." },
      { prompt: "Viví en México ___ dos años.", hint: "I lived in Mexico for two years.", options: ["por", "para"], answer: "por", why: "Duration takes por." },
      { prompt: "Vendí mi bici ___ cien dólares.", hint: "I sold my bike for a hundred dollars.", options: ["por", "para"], answer: "por", why: "An exchange or price takes por." },
      { prompt: "Mañana salgo ___ Barcelona.", hint: "Tomorrow I leave for Barcelona.", options: ["por", "para"], answer: "para", why: "A destination takes para." },
      { prompt: "No dormí bien ___ el ruido.", hint: "I didn't sleep well because of the noise.", options: ["por", "para"], answer: "por", why: "A cause (“because of”) takes por." },
      { prompt: "La tarea es ___ el viernes.", hint: "The homework is for (due) Friday.", options: ["por", "para"], answer: "para", why: "A deadline takes para." },
    ],
    wrap: {
      es: "¡Por fin dominas el por y el para!",
      en: "Now let's practice — I'll ask you about gifts, plans and reasons.",
    },
  },

  "ser-estar": {
    skill: "ser-estar",
    title: "Ser vs estar",
    hook: {
      es: "Ser o estar, esa es la cuestión.",
      en: "Two verbs for “to be” — one for what something is, one for how or where it is.",
    },
    rules: [
      {
        name: "Ser: what something is",
        en: "Use ser for identity and lasting traits: who someone is, where they're from, their job, what they're like, plus time and dates.",
        es: "Usamos ser para la identidad: quién eres, de dónde eres, tu profesión, cómo eres, la hora y la fecha.",
        example: { es: "Soy de Chicago y soy profesora.", en: "I'm from Chicago and I'm a teacher." },
      },
      {
        name: "Estar: how or where it is right now",
        en: "Use estar for locations, temporary states and feelings, and for “-ing” actions (estoy comiendo).",
        es: "Usamos estar para el lugar, los estados temporales y las emociones, y con el gerundio (estoy comiendo).",
        example: { es: "Estoy cansado y estoy en casa.", en: "I'm tired and I'm at home." },
      },
      {
        name: "Same word, different meaning",
        en: "Some adjectives change meaning: es aburrido (he's boring) vs está aburrido (he's bored); es listo (clever) vs está listo (ready).",
        es: "Algunos adjetivos cambian de significado: es aburrido / está aburrido, es listo / está listo.",
        example: { es: "La sopa está rica.", en: "The soup tastes great (right now)." },
      },
    ],
    examples: [
      { es: "Mi hermano es muy alto.", en: "My brother is very tall." },
      { es: "Madrid está en el centro de España.", en: "Madrid is in the center of Spain." },
      { es: "Hoy estoy un poco nerviosa.", en: "Today I'm a little nervous." },
      { es: "Son las tres de la tarde.", en: "It's three in the afternoon." },
    ],
    contrasts: [
      { wrong: "Soy cansado.", right: "Estoy cansado.", why: "Tiredness is a temporary state — estar." },
      { wrong: "El banco es en la plaza.", right: "El banco está en la plaza.", why: "Location takes estar." },
      { wrong: "Estoy de Canadá.", right: "Soy de Canadá.", why: "Origin is part of who you are — ser." },
    ],
    drills: [
      { prompt: "Mi madre ___ doctora.", hint: "My mother is a doctor.", options: ["es", "está"], answer: "es", why: "Profession takes ser." },
      { prompt: "¿Dónde ___ el baño?", hint: "Where is the bathroom?", options: ["es", "está"], answer: "está", why: "Location takes estar." },
      { prompt: "Hoy ___ muy contento.", hint: "Today I'm very happy.", options: ["soy", "estoy"], answer: "estoy", why: "A feeling right now takes estar." },
      { prompt: "Nosotros ___ de Texas.", hint: "We're from Texas.", options: ["somos", "estamos"], answer: "somos", why: "Origin takes ser." },
      { prompt: "Ella ___ estudiando ahora.", hint: "She's studying now.", options: ["es", "está"], answer: "está", why: "“-ing” actions use estar + gerundio." },
      { prompt: "___ las nueve de la noche.", hint: "It's nine at night.", options: ["Son", "Están"], answer: "Son", why: "Time takes ser." },
      { prompt: "La comida ya ___ lista.", hint: "The food is ready now.", options: ["es", "está"], answer: "está", why: "Estar listo = ready (ser listo = clever)." },
      { prompt: "Mis amigos ___ muy simpáticos.", hint: "My friends are very nice.", options: ["son", "están"], answer: "son", why: "Personality traits take ser." },
    ],
    wrap: {
      es: "¡Ser o estar ya no es la cuestión!",
      en: "Now let's use both — tell me about the people in your life.",
    },
  },
};
