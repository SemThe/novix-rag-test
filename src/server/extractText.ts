import { PDFParse } from "pdf-parse";

export async function extractText(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const isPdf = mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  return buffer.toString("utf-8");
}
