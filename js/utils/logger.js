/**
 * 
 * استفاده:
 * import { logger } from './utils/logger.js';
 * 
 * logger.info('پیام اطلاعاتی');
 * logger.success('عملیات موفق');
 * logger.warn('هشدار');
 * logger.error('خطا');
 * logger.debug('دیباگ');
 */

import CONFIG from '../config/constants.js';

class Logger {
    constructor() {
        // دریافت تنظیمات debug از config
        this.enabled = CONFIG.DEBUG?.ENABLED || false;
        this.levels = CONFIG.DEBUG?.LEVELS || {
            info: true,
            success: true,
            warn: true,
            error: true,
            debug: true
        };
        
        // استایل‌های رنگی برای console
        this.styles = {
            info: 'color: #3498db; font-weight: bold;',
            success: 'color: #2ecc71; font-weight: bold;',
            warn: 'color: #f39c12; font-weight: bold;',
            error: 'color: #e74c3c; font-weight: bold;',
            debug: 'color: #9b59b6; font-weight: bold;'
        };
        
        // آیکون‌ها
        this.icons = {
            info: 'ℹ️',
            success: '✅',
            warn: '⚠️',
            error: '❌',
            debug: '🔍'
        };
    }
    
    /**
     * فعال/غیرفعال کردن debug mode
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`%c${enabled ? '✅' : '❌'} Debug Mode ${enabled ? 'فعال' : 'غیرفعال'} شد`, 
                    'font-size: 14px; font-weight: bold;');
    }
    
    /**
     * فعال/غیرفعال کردن یک level خاص
     */
    setLevel(level, enabled) {
        if (this.levels.hasOwnProperty(level)) {
            this.levels[level] = enabled;
        }
    }
    
    /**
     * متد کمکی برای لاگ
     */
    _log(level, ...args) {
        // اگر debug غیرفعال است
        if (!this.enabled) return;
        
        // اگر این level غیرفعال است
        if (!this.levels[level]) return;
        
        const icon = this.icons[level];
        const style = this.styles[level];
        
        // لاگ با استایل
        console.log(`%c${icon} [${level.toUpperCase()}]`, style, ...args);
    }
    
    /**
     * لاگ اطلاعاتی (آبی)
     */
    info(...args) {
        this._log('info', ...args);
    }
    
    /**
     * لاگ موفقیت (سبز)
     */
    success(...args) {
        this._log('success', ...args);
    }
    
    /**
     * لاگ هشدار (نارنجی)
     */
    warn(...args) {
        this._log('warn', ...args);
    }
    
    /**
     * لاگ خطا (قرمز)
     * این همیشه نمایش داده می‌شود حتی در production
     */
    error(...args) {
        console.error(`${this.icons.error} [ERROR]`, ...args);
    }
    
    /**
     * لاگ دیباگ (بنفش)
     */
    debug(...args) {
        this._log('debug', ...args);
    }
    
    /**
     * لاگ گروه‌بندی شده
     */
    group(title, callback) {
        if (!this.enabled) return;
        
        console.group(`%c📦 ${title}`, 'font-weight: bold; font-size: 12px;');
        callback();
        console.groupEnd();
    }
    
    /**
     * لاگ جدول
     */
    table(data) {
        if (!this.enabled) return;
        console.table(data);
    }
    
    /**
     * زمان‌سنجی
     */
    time(label) {
        if (!this.enabled) return;
        console.time(`⏱️ ${label}`);
    }
    
    timeEnd(label) {
        if (!this.enabled) return;
        console.timeEnd(`⏱️ ${label}`);
    }
    
    /**
     * نمایش اطلاعات debug mode
     */
    showStatus() {
        console.group('%c🎛️ Debug Status', 'font-size: 14px; font-weight: bold;');
        console.log('Enabled:', this.enabled);
        console.log('Levels:', this.levels);
        console.groupEnd();
    }
}

// ایجاد instance سراسری
export const logger = new Logger();

// Export برای استفاده در window (برای دسترسی از console)
if (typeof window !== 'undefined') {
    window.logger = logger;
}

export default logger;