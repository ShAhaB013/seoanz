/**
 * Paragraph Length Analyzer
 * تحلیل طول پاراگراف‌ها از نظر خوانایی و سئو
 * استاندارد: ۵۰-۱۲۰ کلمه | قابل‌قبول: ۱۵۰-۱۶۰ کلمه | نامناسب: بالای ۲۰۰ کلمه
 */

import { ReadabilityAnalyzer } from './base-analyzer.js';
import { extractParagraphs } from '../utils/dom-utils.js';
import { countWords } from '../utils/text-utils.js';
import { SEO_LIMITS } from '../config/constants.js';
import { createParagraphFingerprint, normalizeParagraphText } from '../utils/paragraph-utils.js';

export class ParagraphLengthAnalyzer extends ReadabilityAnalyzer {
    constructor(config = {}) {
        super('ParagraphLengthAnalyzer', {
            priority: 11, // اولویت در تب خوانایی
            ...config
        });
    }
    
    async analyze(analysisData) {
        const { content } = analysisData;
        const paragraphs = extractParagraphs(content);
        
        if (!paragraphs || paragraphs.length === 0) {
            return this.createSuccessCheck(
                'طول پاراگراف‌ها',
                'هیچ پاراگرافی یافت نشد',
                { tooltip: 'محتوا فاقد پاراگراف است' }
            );
        }
        
        const stats = this.analyzeParagraphs(paragraphs);
        const longParagraphs = stats.longParagraphs;
        const longParagraphsPercentage = paragraphs.length > 0
            ? (longParagraphs.length / paragraphs.length) * 100
            : 0;
        
        const detail = {
            tooltip: `حداکثر طول مجاز هر پاراگراف ${SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX} کلمه است`,
            totalParagraphs: paragraphs.length,
            stats,
            longPercentage: Number(longParagraphsPercentage.toFixed(1)),
            paragraphs: longParagraphs
        };
        
        if (longParagraphs.length === 0) {
            return this.createSuccessCheck(
                'طول پاراگراف‌ها',
                `تمام ${paragraphs.length} پاراگراف در محدوده استاندارد هستند`,
                detail
            );
        }
        
        if (longParagraphsPercentage > SEO_LIMITS.MAX_LONG_PARAGRAPHS_PERCENTAGE) {
            return this.createErrorCheck(
                'طول پاراگراف‌ها',
                `${detail.longPercentage.toFixed(0)}٪ از پاراگراف‌ها بیش از ${SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX} کلمه هستند (حداکثر مجاز: ${SEO_LIMITS.MAX_LONG_PARAGRAPHS_PERCENTAGE}٪)`,
                detail
            );
        }
        
        return this.createWarningCheck(
            'طول پاراگراف‌ها',
            `${longParagraphs.length} پاراگراف بیش از ${SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX} کلمه دارند.`,
            detail
        );
    }
    
    analyzeParagraphs(paragraphs) {
        const stats = {
            standardCount: 0,    // ≤۱۲۰
            acceptableCount: 0,  // ۱۲۱-۱۶۰
            longCount: 0,        // ۱۶۱-۱۹۹
            unsuitableCount: 0,  // ≥۲۰۰
            longParagraphs: []
        };
        
        paragraphs.forEach((p, index) => {
            const normalized = normalizeParagraphText(p);
            const wordCount = countWords(normalized);
            
            if (wordCount <= SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX) {
                stats.standardCount++;
            } else if (wordCount <= SEO_LIMITS.PARAGRAPH_LENGTH_ACCEPTABLE_MAX) {
                stats.acceptableCount++;
            } else if (wordCount < SEO_LIMITS.PARAGRAPH_LENGTH_UNSUITABLE_MIN) {
                stats.longCount++;
            } else {
                stats.unsuitableCount++;
            }
            
            if (wordCount > SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX) {
                stats.longParagraphs.push({
                    index,
                    wordCount,
                    status: wordCount >= SEO_LIMITS.PARAGRAPH_LENGTH_UNSUITABLE_MIN ? 'unsuitable' : 'long',
                    fingerprint: createParagraphFingerprint(normalized, wordCount, index),
                    normalizedText: normalized,
                    preview: normalized.slice(0, 120)
                });
            }
        });
        
        return stats;
    }
}

export default ParagraphLengthAnalyzer;