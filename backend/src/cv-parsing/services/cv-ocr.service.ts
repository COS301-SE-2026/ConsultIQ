import {
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
  InternalServerErrorException,
} from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

export const SUPPORTED_MIME_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

@Injectable()
export class CvOcrService {
  private readonly logger = new Logger(CvOcrService.name);

  /**
   * Extracts plain text from a CV file buffer based on its MIME type.
   * Routes PDF and DOCX through direct text extraction.
   * Falls back to Tesseract OCR for scanned PDFs with no embedded text.
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case SUPPORTED_MIME_TYPES.PDF:
        return await this.extractFromPdf(buffer);

      case SUPPORTED_MIME_TYPES.DOCX:
        return await this.extractFromDocx(buffer);

      default:
        throw new UnsupportedMediaTypeException(
          `Unsupported file type: ${mimeType}. Only PDF and DOCX files are supported.`,
        );
    }
  }

  /**
   * Extracts text from a PDF. If the PDF has no embedded text (i.e. it's a
   * scanned document or image saved as a PDF), falls back to OCR via Tesseract.
   */
  private async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const result = await pdfParse(buffer);
      const extractedText = this.normaliseText(result.text);

      // If meaningful text was extracted, use it directly
      if (extractedText.length > 50) {
        return extractedText;
      }

      // Otherwise fall back to OCR (likelihood of it being a scanned PDF is high)
      this.logger.warn(
        'PDF has no significant embedded text, falling back to OCR.',
      );
      return await this.extractWithOcr(buffer);
    } catch (error) {
      this.logger.error('Failed to extract text from PDF', error);
      throw new InternalServerErrorException(
        'Failed to extract text from PDF file.',
      );
    }
  }

  /**
   * Extracts text from a DOCX file using mammoth.
   */
  private async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return this.normaliseText(result.value);
    } catch (error) {
      this.logger.error('Failed to extract text from DOCX', error);
      throw new InternalServerErrorException(
        'Failed to extract text from DOCX file.',
      );
    }
  }

  /**
   * Runs OCR on a PDF buffer using Tesseract.js.
   * Used only as a fallback for scanned/image-based PDFs.
   */
  private async extractWithOcr(buffer: Buffer): Promise<string> {
    const worker = await createWorker('eng');

    try {
      const { data } = await worker.recognize(buffer);
      return this.normaliseText(data.text);
    } catch (error) {
      this.logger.error('OCR extraction failed', error);
      throw new InternalServerErrorException(
        'Failed to extract text from scanned document. Please upload a text-based PDF or DOCX.',
      );
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Cleans up extracted text: collapses excessive whitespace or tabs, normalises
   * line endings, and removes blank lines for standard output.
   */
  private normaliseText(rawText: string): string {
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
