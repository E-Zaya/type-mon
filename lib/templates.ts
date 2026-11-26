/**
 * Ready-made lines for work messages. Inserted into the input as Cyrillic;
 * the engine passes Cyrillic through, so they mix with Latin typing.
 * Keep them short and plain. No dashes, one language per line.
 */

export type Template = {
  /** Short label on the button. */
  label: string;
  /** The line inserted. */
  text: string;
};

export const TEMPLATES: Template[] = [
  { label: "Мэндчилгээ", text: "Сайн байна уу?" },
  { label: "Хүсэлт", text: "Та доорх мэдээллийг шалгаж өгнө үү." },
  { label: "Хавсралт", text: "Хавсралтаар илгээлээ." },
  { label: "Хүлээн авсан", text: "Хүлээн авлаа, баярлалаа." },
  { label: "Уулзалт", text: "Маргааш 10 цагт уулзаж болох уу?" },
  { label: "Хариу хүлээх", text: "Хариуг тань хүлээж байна." },
  { label: "Уучлалт", text: "Хоцорсонд уучлаарай." },
  { label: "Төгсгөл", text: "Хүндэтгэсэн," },
];

/** `text` appended to `input` on its own line. */
export function appendTemplate(input: string, text: string): string {
  if (!input) return text;
  const sep = input.endsWith("\n") ? "" : input.endsWith(" ") ? "" : "\n";
  return `${input}${sep}${text}`;
}
