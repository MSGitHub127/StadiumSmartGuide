/**
 * mockAssistantReplies.ts — Multilingual mock reply engine for offline/demo
 * environments where no GCP credentials are available.
 *
 * Detects input language via keyword heuristics and returns translated
 * responses with appropriate deep-link actions.
 */

export interface MockReply {
  response_text: string;
  language: string;
  deep_link_action: { type: string; target_id: string } | null;
}

interface TopicMatch {
  topic: string;
  deepLink: { type: string; target_id: string } | null;
}

const TOPIC_KEYWORDS: {
  keywords: string[];
  topic: string;
  deepLink: TopicMatch['deepLink'];
}[] = [
  {
    keywords: [
      'wheelchair',
      'access',
      'elevator',
      'lift',
      'silla de ruedas',
      'ascensor',
      'acceso',
      'व्हीलचेयर',
      'लिफ्ट',
      'كرسي متحرك',
      'مصعد',
      'fauteuil roulant',
      'ascenseur',
      'accès',
    ],
    topic: 'accessibility',
    deepLink: { type: 'highlight-amenity', target_id: 'Accessible' },
  },
  {
    keywords: [
      'restroom',
      'bathroom',
      'toilet',
      'washroom',
      'baño',
      'toilettes',
      'शौचालय',
      'مرحاض',
      'حمام',
      'toilette',
    ],
    topic: 'restroom',
    deepLink: { type: 'highlight-amenity', target_id: 'Restrooms' },
  },
  {
    keywords: [
      'water',
      'bottle',
      'drink',
      'hydration',
      'agua',
      'botella',
      'bebida',
      'पानी',
      'बोतल',
      'ماء',
      'زجاجة',
      'eau',
      'bouteille',
    ],
    topic: 'hydration',
    deepLink: { type: 'highlight-amenity', target_id: 'Food & Drinks' },
  },
  {
    keywords: [
      'bag',
      'prohibit',
      'size',
      'camera',
      'bolsa',
      'cámara',
      'prohibido',
      'बैग',
      'कैमरा',
      'حقيبة',
      'كاميرا',
      'sac',
      'caméra',
      'interdit',
    ],
    topic: 'prohibited',
    deepLink: null,
  },
  {
    keywords: [
      'food',
      'eat',
      'concession',
      'wait',
      'queue',
      'line',
      'comida',
      'comer',
      'fila',
      'cola',
      'खाना',
      'कतार',
      'طعام',
      'طابور',
      'nourriture',
      'manger',
      'file',
    ],
    topic: 'food',
    deepLink: { type: 'highlight-amenity', target_id: 'Food & Drinks' },
  },
  {
    keywords: [
      'lost',
      'found',
      'item',
      'perdido',
      'encontrado',
      'खोया',
      'मिला',
      'مفقود',
      'perdu',
      'trouvé',
      'objet',
    ],
    topic: 'lostfound',
    deepLink: { type: 'highlight-amenity', target_id: 'Info Desk' },
  },
];

/** Language detection keyword map: lang code → trigger words */
const LANG_DETECT: { code: string; triggers: string[] }[] = [
  {
    code: 'es',
    triggers: [
      'baño',
      'agua',
      'comida',
      'dónde',
      'cómo',
      'hola',
      'ayuda',
      'por favor',
      'silla',
      'ascensor',
      'bolsa',
      'cámara',
      'perdido',
      'fila',
      'cola',
      'comer',
      'bebida',
      'prohibido',
      'encontrado',
      'botella',
    ],
  },
  {
    code: 'hi',
    triggers: [
      'शौचालय',
      'पानी',
      'खाना',
      'कहाँ',
      'कैसे',
      'मदद',
      'कतार',
      'व्हीलचेयर',
      'लिफ्ट',
      'बैग',
      'कैमरा',
      'खोया',
      'मिला',
      'बोतल',
    ],
  },
  {
    code: 'ar',
    triggers: [
      'مرحاض',
      'ماء',
      'طعام',
      'أين',
      'كيف',
      'مساعدة',
      'طابور',
      'كرسي',
      'مصعد',
      'حقيبة',
      'كاميرا',
      'مفقود',
      'زجاجة',
      'حمام',
    ],
  },
  {
    code: 'fr',
    triggers: [
      'toilettes',
      'eau',
      'nourriture',
      'où',
      'comment',
      'aide',
      'file',
      'fauteuil',
      'ascenseur',
      'sac',
      'caméra',
      'perdu',
      'trouvé',
      'bouteille',
      'interdit',
      'manger',
      'objet',
      'bonjour',
      "s'il vous plaît",
    ],
  },
];

type TopicKey =
  | 'accessibility'
  | 'restroom'
  | 'hydration'
  | 'prohibited'
  | 'food'
  | 'lostfound'
  | 'default';

const REPLIES: Record<string, Record<TopicKey, string>> = {
  en: {
    accessibility:
      'Wheelchair-accessible seating is available in all tiers. Accessible elevators are marked on the Live Map in gold.',
    restroom:
      'The nearest restrooms are located near Concourse N, Gate 3, and Concourse S. Restroom 04 is currently 6 minutes away.',
    hydration:
      'Refillable empty water bottles are allowed inside the stadium. There are 12 hydration points located around Concourse L1.',
    prohibited:
      'Bags larger than 30cm × 30cm and professional cameras are prohibited. Large items can be stored at the Gate 3 bag check facility.',
    food: 'Concession stands are located near Concourse S and Concourse N. Concession 02 has moderate crowd wait times (about 85% capacity). Live wait times are listed dynamically in the Queue Tracker.',
    lostfound:
      'Lost and Found claims can be submitted at the Info Desk on Concourse L1. You can also check claims online.',
    default:
      'Welcome to Stadium SmartGuide! I can assist you with wayfinding, accessibility elevators, hydration point locations, and venue policies.',
  },
  es: {
    accessibility:
      'Asientos accesibles para sillas de ruedas están disponibles en todos los niveles. Los ascensores accesibles están marcados en dorado en el Mapa en Vivo.',
    restroom:
      'Los baños más cercanos están ubicados cerca del Pasillo N, la Puerta 3 y el Pasillo S. El Baño 04 está a aproximadamente 6 minutos.',
    hydration:
      'Se permiten botellas de agua vacías recargables dentro del estadio. Hay 12 puntos de hidratación ubicados alrededor del Pasillo L1.',
    prohibited:
      'Las bolsas de más de 30cm × 30cm y las cámaras profesionales están prohibidas. Los artículos grandes pueden guardarse en la consigna de la Puerta 3.',
    food: 'Los puestos de comida están ubicados cerca de los Pasillos S y N. El Puesto 02 tiene tiempos de espera moderados (aproximadamente 85% de capacidad).',
    lostfound:
      'Las reclamaciones de objetos perdidos se pueden realizar en el Mostrador de Información en el Pasillo L1.',
    default:
      '¡Bienvenido a Stadium SmartGuide! Puedo ayudarte con navegación, ascensores accesibles, puntos de hidratación y políticas del lugar.',
  },
  hi: {
    accessibility:
      'व्हीलचेयर-सुलभ सीटें सभी स्तरों पर उपलब्ध हैं। सुलभ लिफ्ट लाइव मैप पर सुनहरे रंग में चिह्नित हैं।',
    restroom:
      'निकटतम शौचालय कॉनकोर्स N, गेट 3 और कॉनकोर्स S के पास स्थित हैं। शौचालय 04 वर्तमान में 6 मिनट दूर है।',
    hydration:
      'स्टेडियम के अंदर खाली रिफिल योग्य पानी की बोतलें ले जाने की अनुमति है। कॉनकोर्स L1 के आसपास 12 हाइड्रेशन पॉइंट हैं।',
    prohibited:
      '30cm × 30cm से बड़े बैग और पेशेवर कैमरे प्रतिबंधित हैं। बड़ी वस्तुएँ गेट 3 बैग चेक सुविधा में रखी जा सकती हैं।',
    food: 'कॉनकोर्स S और N के पास खाद्य स्टॉल स्थित हैं। कंसेशन 02 में मध्यम भीड़ प्रतीक्षा समय (लगभग 85% क्षमता) है।',
    lostfound:
      'खोया-पाया दावे कॉनकोर्स L1 पर सूचना डेस्क पर जमा किए जा सकते हैं।',
    default:
      'स्टेडियम स्मार्टगाइड में आपका स्वागत है! मैं नेविगेशन, सुलभ लिफ्ट, हाइड्रेशन पॉइंट और स्थल नीतियों में आपकी सहायता कर सकता हूँ।',
  },
  ar: {
    accessibility:
      'تتوفر مقاعد يمكن الوصول إليها بالكراسي المتحركة في جميع المستويات. المصاعد المتاحة محددة باللون الذهبي على الخريطة الحية.',
    restroom:
      'أقرب المراحيض تقع بالقرب من الممر N والبوابة 3 والممر S. المرحاض 04 يبعد حالياً 6 دقائق.',
    hydration:
      'يُسمح بإدخال زجاجات المياه الفارغة القابلة لإعادة التعبئة داخل الاستاد. توجد 12 نقطة ترطيب حول الممر L1.',
    prohibited:
      'الحقائب الأكبر من 30 سم × 30 سم والكاميرات المهنية ممنوعة. يمكن تخزين الأغراض الكبيرة في مرفق فحص الحقائب بالبوابة 3.',
    food: 'أكشاك الطعام تقع بالقرب من الممرين S و N. الكشك 02 به أوقات انتظار معتدلة (حوالي 85% من السعة).',
    lostfound: 'يمكن تقديم مطالبات المفقودات في مكتب المعلومات في الممر L1.',
    default:
      'مرحباً بك في Stadium SmartGuide! يمكنني مساعدتك في التنقل والمصاعد المتاحة ونقاط الترطيب وسياسات المكان.',
  },
  fr: {
    accessibility:
      'Des places accessibles en fauteuil roulant sont disponibles à tous les niveaux. Les ascenseurs accessibles sont indiqués en or sur la carte en direct.',
    restroom:
      'Les toilettes les plus proches se trouvent près du Hall N, de la Porte 3 et du Hall S. Les toilettes 04 sont à environ 6 minutes.',
    hydration:
      "Les bouteilles d'eau vides rechargeables sont autorisées à l'intérieur du stade. Il y a 12 points d'hydratation autour du Hall L1.",
    prohibited:
      'Les sacs de plus de 30 cm × 30 cm et les appareils photo professionnels sont interdits. Les objets volumineux peuvent être déposés à la consigne de la Porte 3.',
    food: "Les stands de restauration se trouvent près des Halls S et N. Le Stand 02 a des temps d'attente modérés (environ 85% de capacité).",
    lostfound:
      "Les réclamations d'objets perdus peuvent être soumises au bureau d'information du Hall L1.",
    default:
      "Bienvenue sur Stadium SmartGuide ! Je peux vous aider avec la navigation, les ascenseurs accessibles, les points d'hydratation et les politiques du lieu.",
  },
};

/**
 * Detects language from user message text via keyword matching.
 * Returns ISO 639-1 code. Defaults to 'en'.
 */
export function detectLanguage(message: string): string {
  const lower = message.toLowerCase();
  for (const { code, triggers } of LANG_DETECT) {
    if (triggers.some((t) => lower.includes(t))) {
      return code;
    }
  }
  return 'en';
}

/**
 * Matches a topic from the user message.
 * Returns topic key and optional deep-link action.
 */
function matchTopic(message: string): {
  topic: TopicKey;
  deepLink: MockReply['deep_link_action'];
} {
  const lower = message.toLowerCase();
  for (const entry of TOPIC_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return { topic: entry.topic as TopicKey, deepLink: entry.deepLink };
    }
  }
  return { topic: 'default', deepLink: null };
}

/**
 * Generates a multilingual mock assistant reply.
 * Called from vertexClient.ts when GCP credentials are unavailable.
 */
export function generateMockAssistantReply(userMessage: string): MockReply {
  const lang = detectLanguage(userMessage);
  const { topic, deepLink } = matchTopic(userMessage);
  const langReplies = REPLIES[lang] ?? REPLIES['en']!;
  const text = langReplies[topic] ?? langReplies['default']!;

  return {
    response_text: text,
    language: lang,
    deep_link_action: deepLink,
  };
}
