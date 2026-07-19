import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from './rateLimiter';
import { z } from 'zod';
import { VertexTimeoutError, VertexGenerationError } from './vertexClient';

interface RouteHandlerConfig<TBody, TResult> {
  bodySchema?: z.ZodSchema<TBody>;
  execute: (req: NextRequest, body: TBody) => Promise<{
    prompt?: string;
    tier?: 'flash' | 'pro';
    cacheKey?: string;
    timeoutMs?: number;
    bypassResponse?: TResult;
  }>;
  resultSchema: z.ZodSchema<TResult>;
  errorOverrides?: {
    timeout?: string;
    generation?: string;
  };
}

export function wrapRoute<TBody, TResult>(config: RouteHandlerConfig<TBody, TResult>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // 1. Rate limiting (Only enforce when live project ID is configured to prevent API abuse)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (process.env.GCP_PROJECT_ID && process.env.USE_MOCK_LLM !== 'true' && isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Parse request body if schema is provided
    let parsedBody: TBody = {} as TBody;
    if (config.bodySchema) {
      try {
        const json = await req.json();
        const res = config.bodySchema.safeParse(json);
        if (!res.success) {
          return NextResponse.json(
            { error: 'Invalid request payload format.' },
            { status: 400 }
          );
        }
        parsedBody = res.data;
      } catch {
        return NextResponse.json(
          { error: 'Malformed JSON payload.' },
          { status: 400 }
        );
      }
    }

    try {
      // 3. Run endpoint-specific logic to get prompt config
      const executionConfig = await config.execute(req, parsedBody);

      if (executionConfig.bypassResponse !== undefined) {
        const validated = config.resultSchema.parse(executionConfig.bypassResponse);
        return NextResponse.json(validated, { status: 200 });
      }

      // Import inside function to avoid circular/init dependencies
      const { generateStructuredJson } = await import('./vertexClient');

      // 4. Call LLM
      const rawJson = await generateStructuredJson({
        tier: executionConfig.tier ?? 'flash',
        prompt: executionConfig.prompt ?? '',
        cacheKey: executionConfig.cacheKey ?? '',
        timeoutMs: executionConfig.timeoutMs ?? 8000,
      });

      // 5. Parse LLM JSON output
      let rawParsed: unknown;
      try {
        rawParsed = JSON.parse(rawJson);
      } catch {
        throw new VertexGenerationError('Model returned non-JSON output.');
      }

      // 6. Validate output against expected result schema
      const finalResult = config.resultSchema.safeParse(rawParsed);
      if (!finalResult.success) {
        throw new VertexGenerationError('Model output failed schema validation.');
      }

      return NextResponse.json(finalResult.data, { status: 200 });
    } catch (err) {
      if (err instanceof VertexTimeoutError) {
        return NextResponse.json(
          { error: config.errorOverrides?.timeout ?? 'The request timed out. Please try again.' },
          { status: 504 }
        );
      }
      if (err instanceof VertexGenerationError) {
        console.error('API route: generation error', err.message);
        return NextResponse.json(
          { error: config.errorOverrides?.generation ?? 'Unable to process request right now. Please try again shortly.' },
          { status: 502 }
        );
      }
      console.error('API route: unexpected error', err);
      return NextResponse.json(
        { error: 'Unexpected server error.' },
        { status: 500 }
      );
    }
  };
}
