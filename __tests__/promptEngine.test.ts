import {
  sanitizeField,
  buildWayfindingPrompt,
  buildAssistantPrompt,
  buildCrowdAnalyticsPrompt,
} from '../src/utils/promptEngine';

describe('Prompt Engine Utility Tests', () => {
  describe('sanitizeField', () => {
    test('replaces newlines with space', () => {
      const input = 'hello\nworld\r\nnew line';
      expect(sanitizeField(input)).toBe('hello world new line');
    });

    test('strips backticks, braces, and angle brackets (injection vectors)', () => {
      const input = '`hello` {world} <tag>';
      expect(sanitizeField(input)).toBe('hello world tag');
    });

    test('enforces max length constraints and trims result', () => {
      const input = 'this is a very long string that should be cut off';
      expect(sanitizeField(input, 9)).toBe('this is a');
    });
  });

  describe('prompt builders', () => {
    test('buildWayfindingPrompt structure matches specs', () => {
      const prompt = buildWayfindingPrompt({
        originZoneId: 'ZONE-GATE-3',
        destinationAmenityId: 'AMN-RESTROOM-04',
        accessibilityRequired: false,
        sensors: [],
      });
      expect(prompt).toContain("Stadium SmartGuide's routing/assistant engine");
      expect(prompt).toContain('ZONE-GATE-3');
      expect(prompt).toContain('AMN-RESTROOM-04');
    });

    test('buildAssistantPrompt structure matches specs', () => {
      const prompt = buildAssistantPrompt({
        userMessage: 'Where is Gate 7?',
        detectedLanguage: 'en',
        stadiumPolicySnippets: ['Snippet 1'],
      });
      expect(prompt).toContain('Where is Gate 7?');
      expect(prompt).toContain('Snippet 1');
    });
  });
});
