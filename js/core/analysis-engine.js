/**
 * موتور تحلیل مرکزی
 * هماهنگی و اجرای تمام Analyzer ها
 * ✅ اصلاح شده: استفاده از logger به جای console.log
 */

import AnalysisData from './analysis-data.js';
import { logger } from '../utils/logger.js';

export class AnalysisEngine {
    constructor(config = {}) {
        // رجیستری Analyzer ها
        this.analyzers = {
            seo: [],
            readability: [],
            suggestion: []
        };
        
        // تنظیمات
        this.config = {
            parallel: config.parallel !== false, // اجرای موازی
            stopOnError: config.stopOnError || false, // توقف در صورت خطا
            timeout: config.timeout || 30000, // تایم‌اوت 30 ثانیه
            ...config
        };
        
        // وضعیت
        this.isRunning = false;
        this.currentAnalysis = null;
        
        // رویدادها
        this.listeners = {
            start: [],
            progress: [],
            complete: [],
            error: []
        };
    }
    
    /**
     * ثبت یک Analyzer
     */
    registerAnalyzer(analyzer, type = 'seo') {
        if (!analyzer || typeof analyzer.analyze !== 'function') {
            throw new Error('Analyzer نامعتبر است');
        }
        
        const validTypes = ['seo', 'readability', 'suggestion'];
        if (!validTypes.includes(type)) {
            throw new Error(`نوع نامعتبر: ${type}`);
        }
        
        // استفاده از type از analyzer اگر موجود باشد
        const analyzerType = analyzer.type || type;
        
        this.analyzers[analyzerType].push(analyzer);
        
        // مرتب‌سازی بر اساس اولویت (کمترین عدد = بالاترین اولویت)
        this.analyzers[analyzerType].sort((a, b) => a.priority - b.priority);
        
        logger.success(`Analyzer ثبت شد: ${analyzer.name} (${analyzerType})`);
    }
    
    /**
     * ثبت چند Analyzer یکجا
     */
    registerAnalyzers(analyzers, type = 'seo') {
        analyzers.forEach(analyzer => this.registerAnalyzer(analyzer, type));
    }
    
    /**
     * دریافت تمام Analyzer های فعال
     */
    getActiveAnalyzers(type = null) {
        if (type) {
            return this.analyzers[type].filter(a => a.enabled);
        }
        
        return [
            ...this.analyzers.seo,
            ...this.analyzers.readability,
            ...this.analyzers.suggestion
        ].filter(a => a.enabled);
    }
    
    /**
     * اجرای تحلیل کامل
     */
    async analyze(content, plainText, mainKeyword = '', secondaryKeywords = []) {
        if (this.isRunning) {
            logger.warn('تحلیل در حال اجراست');
            return this.currentAnalysis;
        }
        
        this.isRunning = true;
        const startTime = Date.now();
        
        // ساخت AnalysisData
        const analysisData = new AnalysisData();
        analysisData.setContent(content, plainText);
        analysisData.setKeywords(mainKeyword, secondaryKeywords);
        analysisData.setStatus('analyzing');
        
        this.currentAnalysis = analysisData;
        
        // اعلام شروع
        this.emit('start', { analysisData });
        
        try {
            // مرحله 1: تحلیل آمار اولیه
            await this.calculateStats(analysisData);
            
            // مرحله 2: تصمیم‌گیری - آیا کلمه کلیدی داریم؟
            if (analysisData.hasMainKeyword()) {
                // حالت عادی: تحلیل SEO + خوانایی
                await this.runAnalyzers(analysisData, 'seo');
                await this.runAnalyzers(analysisData, 'readability');
            } else {
                // حالت بدون کلمه کلیدی: فقط پیشنهاد
                await this.runAnalyzers(analysisData, 'suggestion');
            }
            
            // مرحله 3: محاسبه امتیاز نهایی
            analysisData.calculateScore();
            analysisData.setStatus('completed');
            
            const duration = Date.now() - startTime;
            logger.debug(`تحلیل کامل شد در ${duration}ms`);
            
            // اعلام اتمام
            this.emit('complete', { analysisData, duration });
            
            return analysisData;
            
        } catch (error) {
            logger.error('خطا در تحلیل:', error);
            analysisData.setStatus('error');
            
            this.emit('error', { error, analysisData });
            
            throw error;
            
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * محاسبه آمار اولیه
     */
    async calculateStats(analysisData) {
        const { content, plainText } = analysisData;
        
        // استخراج DOM
        const temp = document.createElement('div');
        temp.innerHTML = content;
        
        // محاسبه آمار
        const stats = {
            totalWords: this.countWords(plainText),
            totalWordsWithoutHeadings: this.countWords(
                this.extractTextWithoutHeadings(temp)
            ),
            imageCount: temp.querySelectorAll('img').length,
            linkCount: temp.querySelectorAll('a[href]').length,
            paragraphCount: temp.querySelectorAll('p').length,
            sentenceCount: this.countSentences(plainText)
        };
        
        // اگر کلمه کلیدی داریم، تعداد و تراکم را محاسبه کن
        if (analysisData.hasMainKeyword()) {
            const plainTextWithoutHeadings = this.extractTextWithoutHeadings(temp);
            stats.keywordCount = this.countKeyword(
                plainTextWithoutHeadings,
                analysisData.mainKeyword
            );
            stats.keywordDensity = stats.totalWordsWithoutHeadings > 0
                ? (stats.keywordCount / stats.totalWordsWithoutHeadings) * 100
                : 0;
        }
        
        analysisData.updateStats(stats);
    }
    
    /**
     * اجرای Analyzer های یک نوع خاص
     */
    async runAnalyzers(analysisData, type) {
        const analyzers = this.getActiveAnalyzers(type);
        
        if (analyzers.length === 0) {
            logger.warn(`هیچ ${type} analyzer فعالی وجود ندارد`);
            return;
        }
        
        logger.debug(`اجرای ${analyzers.length} ${type} analyzer...`);
        
        const tasks = analyzers
            .filter(analyzer => analyzer.shouldRun(analysisData))
            .map(analyzer => this.runSingleAnalyzer(analyzer, analysisData));
        
        // اجرای موازی یا ترتیبی
        if (this.config.parallel) {
            await Promise.all(tasks);
        } else {
            for (const task of tasks) {
                await task;
            }
        }
    }
    
    /**
     * اجرای یک Analyzer
     */
    async runSingleAnalyzer(analyzer, analysisData) {
        try {
            const result = await Promise.race([
                analyzer.analyze(analysisData),
                this.timeout(this.config.timeout, `Timeout: ${analyzer.name}`)
            ]);
            
            if (result) {
                // افزودن نتیجه به دسته مناسب
                if (analyzer.type === 'readability') {
                    analysisData.addReadabilityCheck(result);
                } else if (analyzer.type === 'suggestion') {
                    // پیشنهادات به صورت جداگانه مدیریت می‌شوند
                    if (result.suggestions) {
                        analysisData.setSuggestions(
                            result.suggestions.main || [],
                            result.suggestions.secondary || []
                        );
                    }
                } else {
                    analysisData.addSEOCheck(result);
                }
                
                // گزارش پیشرفت
                this.emit('progress', {
                    analyzer: analyzer.name,
                    result,
                    analysisData
                });
            }
            
        } catch (error) {
            analyzer.logError(error, 'در runSingleAnalyzer');
            
            if (this.config.stopOnError) {
                throw error;
            }
        }
    }
    
    /**
     * Promise با timeout
     */
    timeout(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
    
    /**
     * توابع کمکی برای محاسبه آمار
     */
    countWords(text) {
        if (!text) return 0;
        const cleaned = text
            .replace(/<[^>]*>/g, ' ')
            .replace(/[.!?؟۔،,;:\-_()[\]{}«»""'']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const words = cleaned.split(' ').filter(w => w.length > 0 && !/^\d+$/.test(w));
        return words.length;
    }
    
    extractTextWithoutHeadings(dom) {
        const clone = dom.cloneNode(true);
        clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => h.remove());
        return (clone.textContent || '').trim();
    }
    
    countKeyword(text, keyword) {
        if (!keyword) return 0;
        const normalized = text.toLowerCase().trim();
        const normalizedKeyword = keyword.toLowerCase().trim();
        let count = 0;
        let pos = 0;
        while ((pos = normalized.indexOf(normalizedKeyword, pos)) !== -1) {
            count++;
            pos += normalizedKeyword.length;
        }
        return count;
    }
    
    countSentences(text) {
        if (!text) return 0;
        const sentences = text.split(/[.!?؟۔]+/).filter(s => s.trim().length > 0);
        return sentences.length;
    }
    
    /**
     * سیستم رویداد
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                logger.error(`خطا در listener ${event}:`, error);
            }
        });
    }
    
    /**
     * دریافت اطلاعات Engine
     */
    getInfo() {
        return {
            isRunning: this.isRunning,
            analyzers: {
                seo: this.analyzers.seo.map(a => a.getInfo()),
                readability: this.analyzers.readability.map(a => a.getInfo()),
                suggestion: this.analyzers.suggestion.map(a => a.getInfo())
            },
            config: this.config
        };
    }
    
    /**
     * Reset Engine
     */
    reset() {
        if (this.isRunning) {
            logger.warn('نمی‌توان در حین اجرا reset کرد');
            return;
        }
        this.currentAnalysis = null;
    }
}

export default AnalysisEngine;
