/**
 * Word pools for the 60-second typing test.
 *
 * Three modes:
 *   cy  — Mongolian words shown in Cyrillic, typed the TypeMon way (Latin
 *         keys, converted live). This is the mode the product exists for.
 *   cyk — Mongolian words typed on a real Cyrillic keyboard.
 *   en  — English words typed on a Latin keyboard.
 *
 * The order is seeded by the calendar day so everyone who plays today gets
 * the same text and scores are comparable between friends.
 */

export type WpmMode = "cy" | "cyk" | "en";

export const MODES: { id: WpmMode; label: string; hint: string }[] = [
  { id: "cy", label: "Кирилл · TypeMon", hint: "Латин товчлуураар бичнэ, кирилл болж хувирна" },
  { id: "cyk", label: "Кирилл · шууд", hint: "Кирилл гар дээр шууд бичнэ" },
  { id: "en", label: "English", hint: "Англи үгсийг латинаар бичнэ" },
];

export const TEST_SECONDS = 60;

/** Everyday Mongolian words, lowercase, one word each. */
export const MN_WORDS: string[] = [
  "сайн", "байна", "би", "чи", "та", "бид", "тэр", "энэ", "юу", "хэн",
  "хаана", "хэзээ", "яагаад", "яаж", "одоо", "өнөөдөр", "маргааш", "өчигдөр", "өглөө", "орой",
  "шөнө", "өдөр", "сар", "жил", "цаг", "минут", "хүн", "эмэгтэй", "эрэгтэй", "хүүхэд",
  "ээж", "аав", "эгч", "ах", "дүү", "найз", "гэр", "байшин", "хот", "хөдөө",
  "улс", "монгол", "зам", "машин", "автобус", "гудамж", "дэлгүүр", "зах", "мөнгө", "төгрөг",
  "үнэ", "ажил", "сургууль", "багш", "оюутан", "сурагч", "ном", "дэвтэр", "үзэг", "цаас",
  "компьютер", "утас", "интернет", "зураг", "кино", "дуу", "хөгжим", "спорт", "морь", "нохой",
  "муур", "үхэр", "хонь", "ямаа", "тэмээ", "бүргэд", "шувуу", "загас", "мод", "цэцэг",
  "өвс", "ус", "гол", "нуур", "уул", "тал", "говь", "тэнгэр", "нар", "од",
  "салхи", "бороо", "цас", "хүйтэн", "халуун", "дулаан", "сэрүүн", "хоол", "цай", "сүү",
  "мах", "талх", "будаа", "ногоо", "жимс", "алим", "амттан", "ундаа", "идэх", "уух",
  "унтах", "босох", "явах", "ирэх", "очих", "суух", "зогсох", "гүйх", "алхах", "харах",
  "сонсох", "ярих", "хэлэх", "бичих", "унших", "сурах", "мэдэх", "бодох", "хайрлах", "инээх",
  "уйлах", "хүлээх", "авах", "өгөх", "ажиллах", "амрах", "тоглох", "дуулах", "бүжиглэх", "зурах",
  "хийх", "болох", "байх", "чадах", "хүсэх", "хэрэгтэй", "сайхан", "муу", "том", "жижиг",
  "урт", "богино", "өндөр", "хурдан", "удаан", "шинэ", "хуучин", "залуу", "хөгшин", "цагаан",
  "хар", "улаан", "цэнхэр", "ногоон", "шар", "хөх", "бор", "гоё", "амттай", "баярлалаа",
  "уучлаарай", "баяртай", "тийм", "үгүй", "магадгүй", "мэдээж", "бас", "гэхдээ", "харин", "тэгээд",
  "дараа", "өмнө", "дээр", "доор", "дотор", "гадна", "хажууд", "дунд", "нэг", "хоёр",
  "гурав", "дөрөв", "тав", "зургаа", "долоо", "найм", "ес", "арав", "зуу", "мянга",
  "хагас", "бүх", "олон", "цөөн", "их", "бага", "зарим", "өөр", "адил", "хамт",
  "амьдрал", "эрүүл", "өвчин", "эмч", "эмнэлэг", "эм", "хайр", "аз", "жаргал", "баяр",
  "гуниг", "зөв", "буруу", "асуулт", "хариулт", "үнэн", "худал", "санаа", "мөрөөдөл", "ирээдүй",
  "түүх", "соёл", "хэл", "үг", "өгүүлбэр", "захидал", "мэдээ", "сонин", "тоглоом", "бэлэг",
  "монголын", "улсын", "хотын", "объект",
  "наадам", "хурд", "бөх", "сур", "морьтон", "ганзага", "айраг", "цагаан сар",
].filter((w) => !w.includes(" "));

/** Common English words, lowercase. */
export const EN_WORDS: string[] = [
  "the", "be", "to", "of", "and", "in", "that", "have", "it", "for",
  "not", "on", "with", "he", "as", "you", "do", "at", "this", "but",
  "his", "by", "from", "they", "we", "say", "her", "she", "or", "an",
  "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
  "out", "if", "about", "who", "get", "which", "go", "me", "when", "make",
  "can", "like", "time", "no", "just", "him", "know", "take", "people", "into",
  "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back", "after",
  "use", "two", "how", "our", "work", "first", "well", "way", "even", "new",
  "want", "because", "any", "these", "give", "day", "most", "us", "world", "life",
  "hand", "part", "child", "eye", "woman", "place", "week", "case", "point", "home",
  "water", "room", "mother", "area", "money", "story", "month", "right", "study", "book",
  "word", "business", "issue", "side", "kind", "head", "house", "service", "friend", "father",
  "power", "hour", "game", "line", "end", "member", "law", "car", "city", "name",
  "team", "minute", "idea", "kid", "body", "nothing", "ago", "lead", "social", "understand",
  "watch", "together", "follow", "around", "parent", "stop", "face", "anything", "create", "public",
  "already", "speak", "read", "level", "allow", "add", "office", "spend", "door", "health",
  "person", "art", "sure", "such", "war", "history", "party", "within", "grow", "result",
  "open", "change", "morning", "walk", "reason", "low", "win", "girl", "guy", "early",
  "food", "before", "moment", "air", "teacher", "force", "offer", "enough", "both", "education",
  "across", "remember", "foot", "second", "boy", "maybe", "toward", "able", "age", "off",
  "everything", "love", "process", "music", "consider", "appear", "actually", "buy", "probably", "human",
  "wait", "serve", "market", "send", "expect", "sense", "build", "stay", "fall", "nation",
  "plan", "cut", "college", "interest", "course", "someone", "experience", "behind", "reach", "local",
  "remain", "effect", "suggest", "class", "control", "raise", "care", "perhaps", "little", "late",
  "hard", "field", "else", "pass", "sell", "major", "sometimes", "require", "along", "report",
  "role", "better", "effort", "decide", "rate", "strong", "possible", "heart", "show", "leader",
  "light", "voice", "wife", "whole", "mind", "finally", "pull", "return", "free", "price",
  "less", "decision", "explain", "son", "hope", "develop", "view", "carry", "town", "road",
  "drive", "arm", "true", "break", "difference", "thank", "receive", "value", "building", "action",
  "full", "model", "join", "season", "record", "pick", "wear", "paper", "special", "space",
  "ground", "form", "support", "event", "matter", "everyone", "center", "couple", "site", "project",
  "hit", "base", "star", "table", "need", "court", "produce", "eat", "teach", "half",
  "easy", "cost", "figure", "street", "image", "phone", "either", "data", "cover", "quite",
  "picture", "clear", "practice", "piece", "land", "recent", "product", "doctor", "wall", "patient",
  "worker", "news", "test", "movie", "north", "simply", "third", "catch", "step", "baby",
  "computer", "type", "draw", "film", "tree", "source", "red", "nearly", "choose", "cause",
  "hair", "century", "window", "difficult", "listen", "soon", "culture", "chance", "brother", "energy",
  "period", "summer", "realize", "hundred", "plant", "likely", "term", "short", "letter", "choice",
  "single", "rule", "daughter", "south", "husband", "floor", "material", "medical", "hospital", "church",
  "close", "thousand", "risk", "current", "fire", "future", "wrong", "increase", "bank", "west",
  "sport", "board", "seek", "rest", "deal", "fight", "throw", "top", "quickly", "past",
  "goal", "bed", "order", "author", "fill", "focus", "drop", "blood", "push", "nature",
  "color", "store", "reduce", "sound", "note", "fine", "near", "page", "enter", "share",
  "common", "poor", "natural", "race", "series", "similar", "hot", "language", "usually", "dead",
  "rise", "animal", "article", "east", "save", "seven", "artist", "scene", "stock", "career",
  "happy", "exactly", "protect", "approach", "size", "dog", "serious", "ready", "sign", "thought",
  "list", "simple", "quality", "accept", "answer", "left", "meeting", "prepare", "success", "cup",
  "amount", "ability", "staff", "character", "growth", "degree", "wonder", "region", "box", "training",
  "pretty", "trade", "physical", "general", "feeling", "message", "fail", "outside", "arrive", "benefit",
  "forward", "present", "section", "glass", "skill", "sister", "stage", "compare", "miss", "design",
  "sort", "act", "ten", "gun", "station", "blue", "state", "song", "example", "check",
  "environment", "leg", "dark", "various", "rather", "laugh", "guess", "set", "prove", "hang",
  "entire", "rock", "forget", "since", "claim", "remove", "help", "enjoy", "network", "legal",
  "cold", "final", "main", "science", "green", "memory", "card", "above", "seat", "cell",
  "nice", "expert", "spring", "firm", "radio", "visit", "avoid", "imagine", "tonight", "huge",
  "ball", "finish", "talk", "theory", "impact", "respond", "maintain", "charge", "popular", "reveal",
  "direction", "peace", "pay", "sleep", "shake", "hold", "pain", "style", "fish", "positive",
  "treat", "wish", "apply", "hall", "wide", "plate", "gift",
];

/** YYYYMMDD as a number, in the player's local time. */
export function daySeed(date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Small deterministic PRNG (mulberry32) — good enough for shuffling words. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The word sequence for one session. Long enough that nobody runs out in 60
 * seconds (200 WPM would need ~200 words); the pool cycles with a fresh
 * shuffle if it is shorter than that.
 */
export function sessionWords(mode: WpmMode, seed: number, count = 260): string[] {
  const pool = mode === "en" ? EN_WORDS : MN_WORDS;
  const rng = mulberry32(seed + (mode === "en" ? 7 : mode === "cyk" ? 3 : 1));
  const out: string[] = [];
  while (out.length < count) {
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    // Avoid the same word twice in a row across the cycle boundary.
    if (out.length && copy[0] === out[out.length - 1]) copy.push(copy.shift()!);
    out.push(...copy);
  }
  return out.slice(0, count);
}
