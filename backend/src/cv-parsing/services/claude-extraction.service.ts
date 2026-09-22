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
import {
  CvParsingResult,
  ParsedCvData,
  SkillCompetencySignal,
  CvSecurityFlag,
  CV_SECURITY_FLAG_TYPES,
} from '../types/parsed-cv.types';

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
      this.logger.warn('No text available for extraction.');
      return {
        success: false,
        error: 'No text available for extraction.',
        processingTimeMs: Date.now() - startTime,
      };
    }

    let lastError = 'Unknown error';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const outcome = await this.runSingleAttempt(rawText, attempt);

      if (outcome.status === 'success') {
        return { ...outcome.result, processingTimeMs: Date.now() - startTime };
      }

      lastError = outcome.error;

      if (outcome.status === 'fatal') {
        break;
      }

      if (attempt < MAX_ATTEMPTS) {
        await this.sleep(BASE_RETRY_DELAY_MS * attempt);
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
    console.log('Validating parsed CV data:', JSON.stringify(data, null, 2));
    if (!data?.contact || typeof data.contact !== 'object')
      return 'missing contact object';
    if (!Array.isArray(data.skills)) return 'missing skills array';
    if (!Array.isArray(data.experiences)) return 'missing experiences array';
    if (!Array.isArray(data.certifications))
      return 'missing certifications array';
    if (!Array.isArray(data.education)) return 'missing education array';
    if (!data.confidenceScores || typeof data.confidenceScores !== 'object')
      return 'missing confidenceScores object';
    if (!Array.isArray(data.competencySignals))
      return 'missing competencySignals array';
    if (!Array.isArray(data.securityFlags))
      return 'missing securityFlags array';
    for (const flag of data.securityFlags) {
      const hasValidShape =
        flag &&
        typeof flag.field === 'string' &&
        typeof flag.excerpt === 'string' &&
        CV_SECURITY_FLAG_TYPES.includes(flag.flagType);

      if (!hasValidShape) {
        return `securityFlags contains a malformed entry: ${JSON.stringify(flag)}`;
      }
    }
    return null;
  }

  private async runSingleAttempt( rawText: string, attempt: number): Promise <
  | { status: 'success'; result: Omit<CvParsingResult, 'processingTimeMs'> }
  | { status: 'retry'; error: string }
  | { status: 'fatal'; error: string }
 > {
  try {
    this.logger.log(`Attempt ${attempt} to extract CV data...`);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: CV_EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildExtractionUserMessage(rawText) }],
      tools: [cvExtractionSchema],
      tool_choice: { type: 'tool', name: CV_EXTRACTION_TOOL_NAME },
    });

    return this.processResponse(response, attempt);
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';

    if (this.isNonRetryableError(error)) {
      this.logger.error(`Extraction failed, not retrying: ${message}`);
      return { status: 'fatal', error: message };
    }

    this.logger.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} threw: ${message}`);
    return { status: 'retry', error: message };
  }
}

private processResponse(
  response: Anthropic.Message,
  attempt: number,
): { status: 'success'; result: Omit<CvParsingResult, 'processingTimeMs'> } | { status: 'retry'; error: string } {
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );

  if (!toolUseBlock) {
    const error = 'Claude did not return a tool_use block in the response.';
    this.logger.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error}`);
    return { status: 'retry', error };
  }

  const rawOutput = toolUseBlock.input as ParsedCvData & {
    competencySignals: SkillCompetencySignal[];
    securityFlags: CvSecurityFlag[];
  };

  const shapeError = this.validateParsedCvData(rawOutput);
  if (shapeError) {
    const error = `Claude returned data that does not match the expected schema: ${shapeError}`;
    this.logger.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error}`);
    return { status: 'retry', error };
  }

  const { competencySignals, securityFlags, ...data } = rawOutput;

  if (securityFlags.length > 0) {
    this.logger.warn(
      `CV extraction flagged ${securityFlags.length} suspicious item(s): ${JSON.stringify(securityFlags)}`,
    );
  }

  return {
    status: 'success',
    result: { success: true, data, competencySignals, securityFlags },
  };
}

private isNonRetryableError(error: unknown): boolean {
  return (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError ||
    error instanceof Anthropic.BadRequestError ||
    (error instanceof Anthropic.APIError && error.status === 402)
  );
}

  

}
