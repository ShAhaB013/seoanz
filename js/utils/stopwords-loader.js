/**
 * ماژول بارگذاری و مدیریت Stopwords
 * بارگذاری از فایل data/stopwords.txt با fallback به لیست پیش‌فرض
 */

import { logger } from './logger.js';

/**
 * کلاس مدیریت Stopwords
 */
class StopwordsManager {
    constructor() {
        // Set برای O(1) lookup
        this.stopwords = new Set();
        
        // وضعیت بارگذاری
        this.loaded = false;
        this.loading = false;
        
        // لیست پیش‌فرض (fallback) - کوچک و ضروری
        this.fallbackStopwords = [
            // حروف اضافه
            'از', 'در', 'به', 'با', 'برای', 'تا', 'بر', 'روی',
            // ضمایر
            'من', 'تو', 'او', 'ما', 'شما', 'آنها', 'این', 'آن',
            // افعال کمکی
            'است', 'بود', 'باشد', 'شود', 'می', 'نمی', 'باید',
            // حروف ربط
            'که', 'اگر', 'و', 'یا', 'اما', 'ولی',
            // عمومی
            'خیلی', 'بسیار', 'همه', 'هر', 'هیچ',
            // انگلیسی
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
            'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'
        ];
    }
    
    /**
     * بارگذاری stopwords از فایل
     * @returns {Promise<boolean>} موفقیت یا عدم موفقیت
     */
    async load() {
        if (this.loaded) {
            logger.debug('Stopwords قبلاً بارگذاری شده');
            return true;
        }
        
        if (this.loading) {
            logger.debug('Stopwords در حال بارگذاری است...');
            // منتظر می‌مانیم تا بارگذاری کامل شود
            return this.waitForLoad();
        }
        
        this.loading = true;
        
        try {
            logger.info('🔄 بارگذاری stopwords از فایل...');
            
            const response = await fetch('data/stopwords.txt');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            const lines = text.split('\n');
            
            let count = 0;
            lines.forEach(line => {
                // حذف فاصله‌های اضافی
                const trimmed = line.trim();
                
                // نادیده گرفتن خطوط خالی و comment
                if (trimmed && !trimmed.startsWith('#')) {
                    this.stopwords.add(trimmed.toLowerCase());
                    count++;
                }
            });
            
            this.loaded = true;
            this.loading = false;
            
            logger.success(`✅ ${count} stopword بارگذاری شد`);
            return true;
            
        } catch (error) {
            logger.warn('⚠️ خطا در بارگذاری stopwords از فایل:', error.message);
            logger.info('📋 استفاده از لیست پیش‌فرض...');
            
            // استفاده از fallback
            this.loadFallback();
            
            this.loaded = true;
            this.loading = false;
            
            return false;
        }
    }
    
    /**
     * بارگذاری لیست پیش‌فرض
     */
    loadFallback() {
        this.stopwords.clear();
        this.fallbackStopwords.forEach(word => {
            this.stopwords.add(word.toLowerCase());
        });
        logger.info(`✅ ${this.stopwords.size} stopword پیش‌فرض بارگذاری شد`);
    }
    
    /**
     * انتظار برای کامل شدن بارگذاری
     */
    async waitForLoad() {
        const maxWait = 5000; // 5 ثانیه
        const interval = 100; // 100ms
        let elapsed = 0;
        
        while (this.loading && elapsed < maxWait) {
            await new Promise(resolve => setTimeout(resolve, interval));
            elapsed += interval;
        }
        
        return this.loaded;
    }
    
    /**
     * بررسی اینکه آیا کلمه stopword است
     * @param {string} word - کلمه برای بررسی
     * @returns {boolean}
     */
    isStopword(word) {
        if (!word || typeof word !== 'string') return false;
        
        const normalized = word.toLowerCase().trim();
        return this.stopwords.has(normalized);
    }
    
    /**
     * محاسبه نسبت stopwords در یک عبارت
     * @param {string} phrase - عبارت برای بررسی
     * @returns {number} نسبت (0-1)
     */
    calculateStopwordRatio(phrase) {
        if (!phrase || typeof phrase !== 'string') return 0;
        
        const words = phrase.toLowerCase().trim().split(/\s+/);
        if (words.length === 0) return 0;
        
        const stopwordCount = words.filter(word => this.isStopword(word)).length;
        return stopwordCount / words.length;
    }
    
    /**
     * فیلتر کردن stopwords از آرایه کلمات
     * @param {string[]} words - آرایه کلمات
     * @returns {string[]} کلمات بدون stopwords
     */
    filterStopwords(words) {
        if (!Array.isArray(words)) return [];
        return words.filter(word => !this.isStopword(word));
    }
    
    /**
     * شمارش stopwords در متن
     * @param {string} text - متن
     * @returns {number} تعداد stopwords
     */
    countStopwords(text) {
        if (!text || typeof text !== 'string') return 0;
        
        const words = text.toLowerCase().trim().split(/\s+/);
        return words.filter(word => this.isStopword(word)).length;
    }
    
    /**
     * دریافت تمام stopwords
     * @returns {Set<string>}
     */
    getAll() {
        return new Set(this.stopwords);
    }
    
    /**
     * تعداد stopwords بارگذاری شده
     * @returns {number}
     */
    size() {
        return this.stopwords.size;
    }
    
    /**
     * بررسی اینکه آیا بارگذاری شده است
     * @returns {boolean}
     */
    isLoaded() {
        return this.loaded;
    }
    
    /**
     * اضافه کردن stopword جدید (runtime)
     * @param {string|string[]} words - کلمه یا آرایه کلمات
     */
    add(words) {
        if (typeof words === 'string') {
            this.stopwords.add(words.toLowerCase().trim());
        } else if (Array.isArray(words)) {
            words.forEach(word => {
                if (typeof word === 'string') {
                    this.stopwords.add(word.toLowerCase().trim());
                }
            });
        }
    }
    
    /**
     * حذف stopword (runtime)
     * @param {string|string[]} words - کلمه یا آرایه کلمات
     */
    remove(words) {
        if (typeof words === 'string') {
            this.stopwords.delete(words.toLowerCase().trim());
        } else if (Array.isArray(words)) {
            words.forEach(word => {
                if (typeof word === 'string') {
                    this.stopwords.delete(word.toLowerCase().trim());
                }
            });
        }
    }
    
    /**
     * پاک کردن تمام stopwords
     */
    clear() {
        this.stopwords.clear();
        this.loaded = false;
    }
    
    /**
     * ری‌لود کردن stopwords
     */
    async reload() {
        this.clear();
        return this.load();
    }
}

// ایجاد instance سراسری
const stopwordsManager = new StopwordsManager();

// Export instance
export { stopwordsManager };

// Export کلاس برای استفاده‌های پیشرفته
export { StopwordsManager };

// Export توابع کمکی
export const isStopword = (word) => stopwordsManager.isStopword(word);
export const calculateStopwordRatio = (phrase) => stopwordsManager.calculateStopwordRatio(phrase);
export const filterStopwords = (words) => stopwordsManager.filterStopwords(words);
export const countStopwords = (text) => stopwordsManager.countStopwords(text);

// Default export
export default stopwordsManager;