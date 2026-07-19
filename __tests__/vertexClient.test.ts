// Configure process env variables first before loading module
process.env.GCP_PROJECT_ID = 'test-project';
process.env.GCP_LOCATION = 'us-central1';

const {
  generateStructuredJson,
  VertexTimeoutError,
  VertexGenerationError,
} = require('../src/utils/vertexClient');

// Mock the VertexAI SDK
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google-cloud/vertexai', () => {
  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

describe('VertexClient Utility Tests', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
  });

  test('returns generated text and caches result', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: '{"result": "success"}' }],
            },
          },
        ],
      },
    });

    // First call (cache miss)
    const res1 = await generateStructuredJson({
      tier: 'flash',
      prompt: 'Hello',
      cacheKey: 'test-cache-key',
    });

    expect(res1).toBe('{"result": "success"}');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    // Second call (cache hit)
    const res2 = await generateStructuredJson({
      tier: 'flash',
      prompt: 'Hello',
      cacheKey: 'test-cache-key',
    });

    expect(res2).toBe('{"result": "success"}');
    // Generative model call count should still be 1 (bypassed from cache)
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  test('triggers timeout error when request hangs', async () => {
    mockGenerateContent.mockImplementation(() => new Promise(() => {}));

    await expect(
      generateStructuredJson({
        tier: 'flash',
        prompt: 'Hello',
        timeoutMs: 100, // Short timeout
      })
    ).rejects.toThrow(VertexTimeoutError);
  });
});
