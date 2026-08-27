import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeExtractionService } from './claude-extraction.service';
import { CV_EXTRACTION_TOOL_NAME } from '../prompts/cv-extraction.schema';

jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual('@anthropic-ai/sdk');
  const RealAnthropic = actual.default;

  const MockAnthropic = jest.fn();

  Object.setPrototypeOf(MockAnthropic, RealAnthropic);

  return { __esModule: true, ...actual, default: MockAnthropic };
});

// Builds an object that passes `instanceof ErrorClass` without needing
// to know that error class's real constructor arguments.
function fakeError(ErrorClass: any, message = 'test error', extra: Record<string, any> = {}) {
  const err = Object.create(ErrorClass.prototype);
  err.message = message;
  Object.assign(err, extra);
  return err;
}

const validParsedData = {
  contact: { fullName: 'Jane Doe', email: 'jane@example.com' },
  skills: [{ skillName: 'TypeScript', yearsExperience: 3, competencyLevel: 'INTERMEDIATE', confidenceLevel: 0.9 }],
  experiences: [],
  certifications: [],
  education: [],
  confidenceScores: { contact: 0.9, skills: 0.8, experience: 0.5, certifications: 0.5, education: 0.5, overall: 0.7 },
  competencySignals: [
    { skillName: 'TypeScript', inferredCompetency: 'INTERMEDIATE', reasoning: 'Three years of stated hands-on use across two listed roles.' },
  ],
};

const { competencySignals: _validSignals, ...validParsedDataOnly } = validParsedData;

function toolUseResponse(input: unknown) {
  return { content: [{ type: 'tool_use', id: 'toolu_1', name: CV_EXTRACTION_TOOL_NAME, input }] };
}

function textOnlyResponse() {
  return { content: [{ type: 'text', text: 'Sorry, I could not process this document.' }] };
}

describe('ClaudeExtractionService', () => {
  let service: ClaudeExtractionService;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    mockCreate = jest.fn();
    (Anthropic as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaudeExtractionService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('sk-ant-test-key') } },
      ],
    }).compile();

    service = module.get(ClaudeExtractionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns a failure immediately for empty text, without calling the API', async () => {
    const result = await service.extractCvData('   ');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no text available/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns parsed data on a successful call', async () => {
    mockCreate.mockResolvedValueOnce(toolUseResponse(validParsedData));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validParsedDataOnly);
    expect(result.competencySignals).toEqual(validParsedData.competencySignals);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('retries when Claude responds without a tool_use block, then fails after exhausting attempts', async () => {
    mockCreate.mockResolvedValue(textOnlyResponse());

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/did not return a tool_use block/i);
    expect(mockCreate).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS
  });

  it('retries when the returned data fails shape validation', async () => {
    const malformed = { ...validParsedData, skills: 'not an array' };
    mockCreate.mockResolvedValue(toolUseResponse(malformed));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/does not match the expected schema/i);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('recovers if a retryable failure is followed by a successful attempt', async () => {
    mockCreate
      .mockResolvedValueOnce(textOnlyResponse()) // attempt 1: bad response, retried
      .mockResolvedValueOnce(toolUseResponse(validParsedData)); // attempt 2: good

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  }, 10000); // real setTimeout delay between attempts, default 5s Jest timeout is too tight

  it('does not retry on a non-retryable error, like a bad API key', async () => {
    mockCreate.mockRejectedValueOnce(fakeError(Anthropic.AuthenticationError, 'invalid x-api-key'));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid x-api-key/i);
    expect(mockCreate).toHaveBeenCalledTimes(1); // no retry attempted
  });

  it('does not retry on a billing error (402)', async () => {
    mockCreate.mockRejectedValueOnce(fakeError(Anthropic.APIError, 'insufficient credits', { status: 402 }));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

    it('throws on construction if ANTHROPIC_API_KEY is not configured', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          ClaudeExtractionService,
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        ],
      }).compile(),
    ).rejects.toThrow('ANTHROPIC_API_KEY environment variable is not set.');
  });

  it.each([
    ['PermissionDeniedError', Anthropic.PermissionDeniedError],
    ['BadRequestError', Anthropic.BadRequestError],
  ])('does not retry on a non-retryable %s', async (_label, ErrorClass) => {
    mockCreate.mockRejectedValueOnce(fakeError(ErrorClass as any, 'non-retryable test error'));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('exhausts all attempts and fails if a retryable error persists, e.g. a rate limit', async () => {
    mockCreate.mockRejectedValue(fakeError(Anthropic.RateLimitError, 'rate limited, please retry later'));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rate limited/i);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  }, 10000); // real sleep between attempts, default 5s Jest timeout is too tight

  it('falls back to a generic message when a non-Error value is thrown', async () => {
    mockCreate.mockRejectedValue('a plain string rejection, not an Error instance');

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  }, 10000);

  it.each([
    ['missing contact', { ...validParsedData, contact: undefined }],
    ['contact not an object', { ...validParsedData, contact: 'not-an-object' }],
    ['experiences not an array', { ...validParsedData, experiences: {} }],
    ['certifications not an array', { ...validParsedData, certifications: null }],
    ['education not an array', { ...validParsedData, education: undefined }],
    ['missing confidenceScores', { ...validParsedData, confidenceScores: undefined }],
    ['missing competencySignals', { ...validParsedData, competencySignals: undefined }],
  ])('retries when returned data has %s', async (_label, malformed) => {
    mockCreate.mockResolvedValue(toolUseResponse(malformed));

    const result = await service.extractCvData('some CV text');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/does not match the expected schema/i);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});