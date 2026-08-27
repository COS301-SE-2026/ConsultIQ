import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  cvExtractionSchema,
  CV_EXTRACTION_TOOL_NAME,
} from '../prompts/cv-extraction.schema';
import {
  CV_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserMessage,
} from '../prompts/cv-extraction.prompt';
import { CvParsingResult, ParsedCvData } from '../types/parsed-cv.types';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 8192;
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000; // 1 second

@Injectable()
export class ClaudeExtractionService {
  private readonly logger = new Logger(ClaudeExtractionService.name);
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
    }

    this.client = new Anthropic({ apiKey });
  }

  async extractCvData(rawText: string): Promise<CvParsingResult> {
    const startTime = Date.now();

    if (!rawText || rawText.trim().length === 0) {
      return {
        success: false,
        error: 'No text available for extraction.',
        processingTimeMs: Date.now() - startTime,
      };
    }

    let lastError = 'Unknown error';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: CV_EXTRACTION_SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: buildExtractionUserMessage(rawText) },
          ],
          tools: [cvExtractionSchema],
          tool_choice: { type: 'tool', name: CV_EXTRACTION_TOOL_NAME },
        });

        const toolUseBlock = response.content.find(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );
        if (!toolUseBlock) {
          lastError = 'Claude did not return a tool_use block in the response.';
          this.logger.warn(
            `Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`,
          );
          continue;
        }

        const parsedData = toolUseBlock.input as ParsedCvData;
        const shapeError = this.validateParsedCvData(parsedData);
        if (shapeError) {
          lastError = `Claude returned data that does not match the expected schema: ${shapeError}`;
          this.logger.warn(
            `Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`,
          );
          continue;
        }

        return {
          success: true,
          data: parsedData,
          processingTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = (error as Error).message || 'Unknown error';

        const nonRetryable =
          error instanceof Anthropic.AuthenticationError ||
          error instanceof Anthropic.PermissionDeniedError ||
          error instanceof Anthropic.BadRequestError ||
          (error instanceof Anthropic.APIError && error.status === 402);

        if (nonRetryable) {
          this.logger.error(`Extraction failed, not retrying: ${lastError}`);
          break;
        }

        this.logger.warn(
          `Attempt ${attempt}/${MAX_ATTEMPTS} threw: ${lastError}`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await this.sleep(BASE_RETRY_DELAY_MS * attempt);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      processingTimeMs: Date.now() - startTime,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private validateParsedCvData(data: any): string | null {
    if (!data?.contact || typeof data.contact !== 'object')
      return 'missing contact object';
    if (!Array.isArray(data.skills)) return 'missing skills array';
    if (!Array.isArray(data.experiences)) return 'missing experiences array';
    if (!Array.isArray(data.certifications))
      return 'missing certifications array';
    if (!Array.isArray(data.education)) return 'missing education array';
    if (!data.confidenceScores || typeof data.confidenceScores !== 'object')
      return 'missing confidenceScores object';
    return null;
  }
}
