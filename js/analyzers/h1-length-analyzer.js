/**
 * H1 Length Analyzer
 * بررسی طول عنوان H1 از نظر سئو
 * استاندارد: 20-70 کاراکتر
 */

import { SEOAnalyzer } from './base-analyzer.js';
import { parseHTML } from '../utils/dom-utils.js';
import { SEO_LIMITS } from '../config/constants.js';

export class H1LengthAnalyzer extends SEOAnalyzer {
    constructor(config = {}) {
        super('H1LengthAnalyzer', {
            requiresKeyword: false, // فقط طول را بررسی می‌کنیم
            priority: 2, // بعد از H1Analyzer اجرا شود
            minLength: config.minLength || SEO_LIMITS.MIN_H1_LENGTH,
            maxLength: config.maxLength || SEO_LIMITS.MAX_H1_LENGTH,
            ...config
        });
    }
    
    async analyze(analysisData) {
        const { content } = analysisData;
        
        // استخراج متن H1
        const h1Text = this.extractH1Text(content);
        
        if (!h1Text) {
            return this.createErrorCheck(
                'طول عنوان H1',
                'هیچ عنوان H1 در صفحه یافت نشد',
                { 
                    tooltip: 'هر صفحه باید دارای یک H1 باشد',
                    minLength: this.config.minLength,
                    maxLength: this.config.maxLength
                }
            );
        }
        
        const length = h1Text.length;
        const minLength = this.config.minLength;
        const maxLength = this.config.maxLength;
        
        if (length < minLength) {
            return this.createWarningCheck(
                'طول عنوان H1',
                `عنوان H1 خیلی کوتاه است (${length} کاراکتر)`,
                {
                    tooltip: `طول بهینه: ${minLength}-${maxLength} کاراکتر`,
                    currentLength: length,
                    minLength,
                    maxLength
                }
            );
        } else if (length > maxLength) {
            return this.createWarningCheck(
                'طول عنوان H1',
                `عنوان H1 خیلی طولانی است (${length} کاراکتر)`,
                {
                    tooltip: `طول بهینه: ${minLength}-${maxLength} کاراکتر`,
                    currentLength: length,
                    minLength,
                    maxLength
                }
            );
        }
        
        return this.createSuccessCheck(
            'طول عنوان H1',
            `عنوان H1 در محدوده بهینه است (${length} کاراکتر)`,
            {
                tooltip: `طول بهینه: ${minLength}-${maxLength} کاراکتر`,
                currentLength: length
            }
        );
    }
    
    extractH1Text(html) {
        const parser = parseHTML(html);
        const h1 = parser.querySelector('h1');
        return h1 ? h1.textContent.trim() : null;
    }
}

export default H1LengthAnalyzer;