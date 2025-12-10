/**
 * ابزارهای کمکی مربوط به پاراگراف‌ها
 */

import { normalizeText } from './text-utils.js';

/**
 * نرمال‌سازی متن پاراگراف برای محاسبه fingerprint
 * @param {string} text
 * @returns {string}
 */
export function normalizeParagraphText(text = '') {
    const normalized = normalizeText(text || '')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized;
}

/**
 * ساخت fingerprint سبک برای پاراگراف
 * @param {string} text
 * @param {number} wordCount
 * @returns {string}
 */
export function createParagraphFingerprint(text = '', wordCount = 0, seed = 0) {
    const normalized = normalizeParagraphText(text);
    let hash = 0;

    for (let i = 0; i < normalized.length && i < 256; i++) {
        const charCode = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + charCode;
        hash |= 0; // تبدیل به 32bit
    }

    const safeHash = Math.abs(hash).toString(36);
    const safeSeed = Number.isFinite(seed) ? seed : 0;
    return `p${safeSeed}_${wordCount}_${safeHash}`;
}

export default {
    normalizeParagraphText,
    createParagraphFingerprint
};

