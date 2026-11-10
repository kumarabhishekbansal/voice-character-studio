/**
 * Contextual Emotion Recommendation & Script Segmentation Engine
 * Provides zero-cost advisory emotion/style recommendations without forcing changes.
 */

const CONTEXT_PATTERNS = [
  {
    emotion: 'fearful',
    alternate: 'angry',
    style: 'whispering',
    intensity: 'moderate',
    reason: 'Urgent warning or threat cues detected',
    regex: /\b(stay away|don't come|help me|screaming|run away|scared|terrified|ghost|haunted|bachao|dar lag|bhoot|mat aao|hat jao|chilla)\b/i,
  },
  {
    emotion: 'suspenseful',
    alternate: 'serious',
    style: 'storytelling',
    intensity: 'moderate',
    reason: 'Mystery, sudden turn, or tension indicators detected',
    regex: /\b(suddenly|nobody there|that night|darkness|behind me|footsteps|something was wrong|quietly|mystery|achanak|andhera|sannata|parchai|khatra|rahasya)\b/i,
  },
  {
    emotion: 'angry',
    alternate: 'serious',
    style: 'energetic-speaking',
    intensity: 'moderate',
    reason: 'Confrontational or frustrated language detected',
    regex: /\b(how dare|enough is enough|shut up|furious|unacceptable|stop lying|betrayed|bakwas|gussa|bas karo|himmat kaise)\b/i,
  },
  {
    emotion: 'surprised',
    alternate: 'happy',
    style: 'energetic-speaking',
    intensity: 'moderate',
    reason: 'Disbelief or unexpected reveal phrasing detected',
    regex: /\b(cannot believe|can't believe|actually came back|no way|oh my god|what on earth|seriously\?!|sach mein|kya baat|yakeen nahi|hairan)\b/i,
  },
  {
    emotion: 'sad',
    alternate: 'emotional',
    style: 'soft-speaking',
    intensity: 'moderate',
    reason: 'Longing, loss, or reflective phrasing detected',
    regex: /\b(waiting for you|for so long|goodbye|missed you|all alone|tears|broken heart|never came back|sorry|alvida|udasi|dukh|akela|yaad|intezaar)\b/i,
  },
  {
    emotion: 'motivational',
    alternate: 'confident',
    style: 'energetic-speaking',
    intensity: 'moderate',
    reason: 'Empowering or inspiring call-to-action detected',
    regex: /\b(never give up|believe in yourself|you can do|rise again|dream big|keep pushing|success|himmat|haar mat|jeet|mehnat|sapne)\b/i,
  },
  {
    emotion: 'romantic',
    alternate: 'calm',
    style: 'soft-speaking',
    intensity: 'subtle',
    reason: 'Affectionate or warm intimate wording detected',
    regex: /\b(love you|my heart|forever with|darling|beautiful soul|pyar|mohabbat|dil se|zindagi)\b/i,
  },
  {
    emotion: 'happy',
    alternate: 'excited',
    style: 'normal-conversation',
    intensity: 'moderate',
    reason: 'Cheerful or celebratory tone cues detected',
    regex: /\b(wonderful|awesome|amazing|celebrate|congratulations|so happy|thank you so much|khushi|badhai|shandar|kamaal|waah)\b/i,
  },
  {
    emotion: 'sarcastic',
    alternate: 'confident',
    style: 'normal-conversation',
    intensity: 'subtle',
    reason: 'Ironic or wry conversational markers detected',
    regex: /\b(oh great|yeah right|obviously|brilliant idea|totally worked|haan bilkul|bada kamaal)\b/i,
  },
  {
    emotion: 'empathetic',
    alternate: 'calm',
    style: 'soft-speaking',
    intensity: 'subtle',
    reason: 'Supportive and reassuring wording detected',
    regex: /\b(i understand|it's okay|i'm here for you|don't worry|take your time|chinta mat|main hoon na|samajhta)\b/i,
  },
];

export class EmotionAnalyzer {
  /**
   * Analyzes a segment text and recommends contextually plausible emotions.
   * Advisory only; never replaces manual user choice automatically unless accepted.
   */
  static recommendEmotion(text) {
    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return {
        primaryEmotion: 'neutral',
        alternateEmotion: 'calm',
        suggestedStyle: 'normal-conversation',
        suggestedIntensity: 'subtle',
        reason: 'Insufficient text context; neutral recommended',
        isAdvisory: true,
      };
    }

    const trimmed = text.trim();

    for (const pattern of CONTEXT_PATTERNS) {
      if (pattern.regex.test(trimmed)) {
        const hasExclamation = trimmed.includes('!');
        return {
          primaryEmotion: pattern.emotion,
          alternateEmotion: pattern.alternate,
          suggestedStyle: pattern.style,
          suggestedIntensity: hasExclamation && pattern.intensity === 'moderate' ? 'strong' : pattern.intensity,
          reason: `${pattern.reason} (contextual recommendation)`,
          isAdvisory: true,
        };
      }
    }

    // Punctuation & structural heuristics
    if (trimmed.includes('...') || trimmed.endsWith('…')) {
      return {
        primaryEmotion: 'emotional',
        alternateEmotion: 'sad',
        suggestedStyle: 'soft-speaking',
        suggestedIntensity: 'subtle',
        reason: 'Trailing ellipsis suggests reflective or emotional beat (contextual recommendation)',
        isAdvisory: true,
      };
    }

    if (trimmed.endsWith('?')) {
      return {
        primaryEmotion: 'curious',
        alternateEmotion: 'surprised',
        suggestedStyle: 'normal-conversation',
        suggestedIntensity: 'moderate',
        reason: 'Question phrasing suggests inquisitive inflection (contextual recommendation)',
        isAdvisory: true,
      };
    }

    if (trimmed.includes('!')) {
      return {
        primaryEmotion: 'excited',
        alternateEmotion: 'confident',
        suggestedStyle: 'energetic-speaking',
        suggestedIntensity: 'moderate',
        reason: 'Exclamation punctuation suggests heightened energy (contextual recommendation)',
        isAdvisory: true,
      };
    }

    if (trimmed.length > 180) {
      return {
        primaryEmotion: 'calm',
        alternateEmotion: 'serious',
        suggestedStyle: 'storytelling',
        suggestedIntensity: 'subtle',
        reason: 'Long-form paragraph suited for steady narrative pacing (contextual recommendation)',
        isAdvisory: true,
      };
    }

    return {
      primaryEmotion: 'neutral',
      alternateEmotion: 'calm',
      suggestedStyle: 'normal-conversation',
      suggestedIntensity: 'subtle',
      reason: 'Balanced conversational text (contextual recommendation)',
      isAdvisory: true,
    };
  }

  /**
   * Splits a raw script into segments by paragraphs/blank lines or speaker prefixes (e.g., "Ghost: Hello")
   */
  static splitScriptIntoSegments(rawScript, defaults = {}, existingSpeakers = []) {
    if (!rawScript || !rawScript.trim()) return [];

    const blocks = rawScript
      .split(/\n{2,}|(?=\n[A-Z][a-zA-Z0-9 _]{1,20}:)/)
      .map((s) => s.trim())
      .filter(Boolean);

    const lines = blocks.length > 1 ? blocks : rawScript.split(/\n+/).map((s) => s.trim()).filter(Boolean);

    return lines.map((line, index) => {
      let text = line;
      let speakerId = defaults.speakerId || existingSpeakers[0]?.id || 'narrator';

      // Check for "Character: dialogue" prefix without permanently deleting unmatched names
      const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]{1,22}):\s+(.+)$/s);
      if (match) {
        const prefixName = match[1].trim().toLowerCase();
        const foundSpeaker = existingSpeakers.find(
          (sp) => sp.name.toLowerCase() === prefixName
        );
        if (foundSpeaker) {
          speakerId = foundSpeaker.id;
          text = match[2].trim();
        }
      }

      const rec = EmotionAnalyzer.recommendEmotion(text);
      return {
        id: `seg_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
        speakerId,
        text,
        emotion: defaults.autoDetect ? rec.primaryEmotion : (defaults.emotion || 'neutral'),
        intensity: defaults.autoDetect ? rec.suggestedIntensity : (defaults.intensity || 'moderate'),
        style: defaults.autoDetect ? rec.suggestedStyle : (defaults.style || 'normal-conversation'),
        speed: defaults.speed ?? 1.0,
        pitchPreference: defaults.pitchPreference ?? 0,
        pauseAfterMs: defaults.pauseAfterMs ?? 550,
        recommendation: rec,
      };
    });
  }

  /**
   * Non-destructively applies pronunciation substitutions onto a working text copy.
   * Preserves original user script untouched.
   */
  static applyPronunciationDictionary(text, dictionary = []) {
    if (!text || !Array.isArray(dictionary) || dictionary.length === 0) {
      return text;
    }

    let output = text;
    for (const entry of dictionary) {
      const term = (entry?.word || '').trim();
      const replacement = (entry?.pronunciation || '').trim();
      if (!term || !replacement) continue;

      // Escape regex metacharacters safely
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      output = output.replace(regex, replacement);
    }
    return output;
  }

  /**
   * Formats pause directives for Kokoro-82M (which does not understand Gemini <short pause> XML tags)
   */
  static sanitizeTextForLocalKokoro(text) {
    if (!text) return '';
    return text
      .replace(/<\s*short pause\s*>/gi, '... ')
      .replace(/<\s*long pause\s*>/gi, '...... ')
      .replace(/<[^>]{1,30}>/g, '') // Strip vocal burst tags cleanly so Kokoro doesn't read them aloud
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
