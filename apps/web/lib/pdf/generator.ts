import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Exercise, SentenceDirection } from "@lingua/shared";

const MARGIN = 50;
const PAGE_BREAK_THRESHOLD = 100;

const TITLE_FONT_SIZE = 14;
const META_FONT_SIZE = 10;
const FOOTER_FONT_SIZE = 9;
const SECTION_FONT_SIZE = 14;
const SENTENCE_FONT_SIZE = 12;

const LINE_HEIGHT = 18;
const TITLE_GAP = 24;
const META_GAP = 28;
const SECTION_GAP = 26;
const TEXT_TO_LINES_GAP = 6;
const ANSWER_LINE_GAP = 22;
const ANSWER_LINES_PER_SENTENCE = 2;
const SENTENCE_GAP = 24;
const ANSWER_LINE_COLOR = rgb(0.55, 0.55, 0.55);
const META_COLOR = rgb(0.45, 0.45, 0.45);
const HEADER_Y_OFFSET = 26;
const FOOTER_Y_OFFSET = 28;

const SECTION_TITLES: Record<SentenceDirection, string> = {
  "en-uk": "Перекладіть українською",
  "uk-en": "Перекладіть англійською",
};

const SECTION_ORDER: SentenceDirection[] = ["en-uk", "uk-en"];

export async function generateExercisePdf(
  exercise: Exercise
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(fontsDir, "Roboto-Regular.ttf")),
    readFile(path.join(fontsDir, "Roboto-Bold.ttf")),
  ]);
  const regularFont = await pdfDoc.embedFont(regularBytes);
  const boldFont = await pdfDoc.embedFont(boldBytes);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const textWidth = width - MARGIN * 2;
  let y = height - MARGIN;

  const title = exercise.subtopic
    ? `Вправа: ${exercise.topic} — ${exercise.subtopic}`
    : `Вправа: ${exercise.topic}`;
  page.drawText(title, {
    x: MARGIN,
    y,
    size: TITLE_FONT_SIZE,
    font: boldFont,
  });
  y -= TITLE_GAP + META_GAP;

  let number = 1;
  for (const direction of SECTION_ORDER) {
    const sentences = exercise.sentences.filter(
      (sentence) => sentence.direction === direction
    );
    if (sentences.length === 0) continue;

    if (y - SECTION_FONT_SIZE - LINE_HEIGHT < PAGE_BREAK_THRESHOLD) {
      page = pdfDoc.addPage();
      y = height - MARGIN;
    }

    page.drawText(SECTION_TITLES[direction], {
      x: MARGIN,
      y,
      size: SECTION_FONT_SIZE,
      font: boldFont,
    });
    y -= SECTION_GAP;

    for (const sentence of sentences) {
      const lines = wrapText(
        `${number}. ${sentence.source}`,
        regularFont,
        SENTENCE_FONT_SIZE,
        textWidth
      );
      const blockHeight =
        lines.length * LINE_HEIGHT +
        TEXT_TO_LINES_GAP +
        ANSWER_LINES_PER_SENTENCE * ANSWER_LINE_GAP +
        SENTENCE_GAP;

      if (y - blockHeight < MARGIN) {
        page = pdfDoc.addPage();
        y = height - MARGIN;
      }

      for (const line of lines) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: SENTENCE_FONT_SIZE,
          font: regularFont,
        });
        y -= LINE_HEIGHT;
      }

      y -= TEXT_TO_LINES_GAP;
      for (let lineIndex = 0; lineIndex < ANSWER_LINES_PER_SENTENCE; lineIndex++) {
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: width - MARGIN, y },
          thickness: 0.8,
          color: ANSWER_LINE_COLOR,
        });
        if (lineIndex < ANSWER_LINES_PER_SENTENCE - 1) {
          y -= ANSWER_LINE_GAP;
        }
      }
      y -= SENTENCE_GAP;

      number += 1;
    }
  }

  const formattedDate = new Date().toLocaleDateString("uk-UA");
  const dateText = `Дата: ${formattedDate}`;
  const pages = pdfDoc.getPages();

  for (const [index, pdfPage] of pages.entries()) {
    const size = pdfPage.getSize();

    const dateWidth = regularFont.widthOfTextAtSize(dateText, META_FONT_SIZE);
    pdfPage.drawText(dateText, {
      x: size.width - MARGIN - dateWidth,
      y: size.height - HEADER_Y_OFFSET,
      size: META_FONT_SIZE,
      font: regularFont,
      color: META_COLOR,
    });

    const footerText = `Сторінка ${index + 1} з ${pages.length}`;
    const footerWidth = regularFont.widthOfTextAtSize(
      footerText,
      FOOTER_FONT_SIZE
    );
    pdfPage.drawText(footerText, {
      x: (size.width - footerWidth) / 2,
      y: FOOTER_Y_OFFSET,
      size: FOOTER_FONT_SIZE,
      font: regularFont,
      color: META_COLOR,
    });
  }

  return pdfDoc.save();
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}
