/**
 * mockAssistantReplies.test.ts — Tests for the multilingual mock reply engine.
 *
 * Covers: detectLanguage, generateMockAssistantReply across 5 languages
 * (en, es, hi, ar, fr), all topic deep-links, and default/fallback behavior.
 */

import {
  detectLanguage,
  generateMockAssistantReply,
  MockReply,
} from '@/utils/mockAssistantReplies';

describe('detectLanguage()', () => {
  test('detects Spanish from keyword "baño"', () => {
    expect(detectLanguage('Donde estan los baños?')).toBe('es');
  });

  test('detects Hindi from keyword "शौचालय"', () => {
    expect(detectLanguage('शौचालय कहाँ है?')).toBe('hi');
  });

  test('detects Arabic from keyword "مرحاض"', () => {
    expect(detectLanguage('أين المرحاض؟')).toBe('ar');
  });

  test('detects French from keyword "toilettes"', () => {
    expect(detectLanguage('Ou sont les toilettes?')).toBe('fr');
  });

  test('defaults to English for unrecognized language', () => {
    expect(detectLanguage('Hello, where is section A?')).toBe('en');
  });

  test('defaults to English for empty string', () => {
    expect(detectLanguage('')).toBe('en');
  });

  test('is case-insensitive', () => {
    expect(detectLanguage('DONDE ESTAN LOS BAÑOS?')).toBe('es');
  });
});

describe('generateMockAssistantReply() — Language detection integration', () => {
  test('English restroom query returns English reply with Restrooms deep-link', () => {
    const reply = generateMockAssistantReply('Where is the restroom?');
    expect(reply.language).toBe('en');
    expect(reply.response_text).toContain('restroom');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Restrooms',
    });
  });

  test('Spanish query "Donde estan los baños?" returns Spanish reply', () => {
    const reply = generateMockAssistantReply('Donde estan los baños?');
    expect(reply.language).toBe('es');
    expect(reply.response_text).toContain('baños');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Restrooms',
    });
  });

  test('Hindi query with restroom keyword returns Hindi reply', () => {
    const reply = generateMockAssistantReply('शौचालय कहाँ है?');
    expect(reply.language).toBe('hi');
    expect(reply.response_text).toContain('शौचालय');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Restrooms',
    });
  });

  test('Arabic query with restroom keyword returns Arabic reply', () => {
    const reply = generateMockAssistantReply('أين المرحاض؟');
    expect(reply.language).toBe('ar');
    expect(reply.response_text).toContain('مراحيض');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Restrooms',
    });
  });

  test('French query "Ou sont les toilettes?" returns French reply', () => {
    const reply = generateMockAssistantReply('Ou sont les toilettes?');
    expect(reply.language).toBe('fr');
    expect(reply.response_text).toContain('toilettes');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Restrooms',
    });
  });

  test('unknown language query defaults to English', () => {
    const reply = generateMockAssistantReply('Waar is het toilet?'); // Dutch
    expect(reply.language).toBe('en');
  });
});

describe('generateMockAssistantReply() — Topic deep-link actions', () => {
  test('accessibility topic returns highlight-amenity Accessible', () => {
    const reply = generateMockAssistantReply(
      'Where is the wheelchair elevator?'
    );
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Accessible',
    });
  });

  test('restroom topic returns highlight-amenity Restrooms', () => {
    const reply = generateMockAssistantReply('I need the bathroom');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Restrooms',
    });
  });

  test('hydration topic returns highlight-amenity Food & Drinks', () => {
    const reply = generateMockAssistantReply('Where can I get water?');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Food & Drinks',
    });
  });

  test('food topic returns highlight-amenity Food & Drinks', () => {
    const reply = generateMockAssistantReply('Where is the food concession?');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Food & Drinks',
    });
  });

  test('prohibited topic returns null deep-link', () => {
    const reply = generateMockAssistantReply('Is my camera bag allowed?');
    expect(reply.deep_link_action).toBeNull();
  });

  test('lostfound topic returns highlight-amenity Info Desk', () => {
    const reply = generateMockAssistantReply('I lost an item');
    expect(reply.deep_link_action).toEqual({
      type: 'highlight-amenity',
      target_id: 'Info Desk',
    });
  });

  test('unrecognized topic returns default reply with null deep-link', () => {
    const reply = generateMockAssistantReply('Hello there');
    expect(reply.deep_link_action).toBeNull();
    expect(reply.response_text).toContain('SmartGuide');
  });
});

describe('generateMockAssistantReply() — reply structure', () => {
  test('always returns a well-formed MockReply object', () => {
    const reply = generateMockAssistantReply('bathroom');
    expect(reply).toHaveProperty('response_text');
    expect(reply).toHaveProperty('language');
    expect(reply).toHaveProperty('deep_link_action');
    expect(typeof reply.response_text).toBe('string');
    expect(typeof reply.language).toBe('string');
    expect(reply.response_text.length).toBeGreaterThan(0);
  });
});
