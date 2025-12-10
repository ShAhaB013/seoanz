/**
 * مدیریت ورودی کلمات کلیدی
 */

export class KeywordsInput {
    constructor(onChangeCallback) {
        this.elements = {
            mainKeyword: null,
            secondaryKeywords: null,
            keywordsTags: null
        };
        this.secondaryKeywordsArray = [];
        this.secondaryKeywordsLookup = new Set();
        this.onChangeCallback = onChangeCallback;
    }
    
    /**
     * مقداردهی اولیه
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
    }
    
    /**
     * کش کردن المان‌ها
     */
    cacheElements() {
        this.elements.mainKeyword = document.getElementById('mainKeyword');
        this.elements.secondaryKeywords = document.getElementById('secondaryKeywords');
        this.elements.keywordsTags = document.getElementById('keywordsTags');
    }
    
    /**
     * اتصال event listener ها
     */
    attachEventListeners() {
        // کلمه کلیدی اصلی
        this.elements.mainKeyword.addEventListener('input', () => {
            if (this.onChangeCallback) {
                this.onChangeCallback();
            }
        });
        
        // کلمات فرعی - Enter برای افزودن
        this.elements.secondaryKeywords.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addKeywordTag();
            } else if (e.key === 'Backspace' && e.target.value === '') {
                this.removeLastKeywordTag();
            }
        });
        
        // جلوگیری از submit فرم
        this.elements.secondaryKeywords.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }
    
    /**
     * افزودن تگ کلمه کلیدی
     */
    addKeywordTag() {
        const input = this.elements.secondaryKeywords;
        const value = input.value;
        const result = this.addSecondaryKeyword(value);
        
        if (['added', 'duplicate', 'empty'].includes(result.status)) {
            input.value = '';
        }
    }
    
    /**
     * حذف آخرین تگ
     */
    removeLastKeywordTag() {
        if (this.secondaryKeywordsArray.length === 0) return;
        
        const removed = this.secondaryKeywordsArray.pop();
        this.secondaryKeywordsLookup.delete(this.getCanonicalKeyword(removed));
        this.renderKeywordTags();
        
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }
    
    /**
     * حذف یک تگ خاص
     */
    removeKeywordTag(keyword) {
        const formattedKeyword = this.normalizeKeyword(keyword);
        const canonical = this.getCanonicalKeyword(formattedKeyword);
        const index = this.secondaryKeywordsArray.findIndex(k => this.getCanonicalKeyword(k) === canonical);
        if (index > -1) {
            const removed = this.secondaryKeywordsArray.splice(index, 1)[0];
            this.secondaryKeywordsLookup.delete(this.getCanonicalKeyword(removed));
            this.renderKeywordTags();
            
            if (this.onChangeCallback) {
                this.onChangeCallback();
            }
        }
    }
    
    /**
     * رندر تگ‌های کلمات کلیدی
     */
    renderKeywordTags() {
        const container = this.elements.keywordsTags;
        const fragment = document.createDocumentFragment();
        
        this.secondaryKeywordsArray.forEach(keyword => {
            const tag = document.createElement('div');
            tag.className = 'keyword-tag';
            
            const text = document.createElement('span');
            text.className = 'keyword-tag-text';
            text.textContent = keyword;
            text.title = keyword;
            
            const removeBtn = document.createElement('span');
            removeBtn.className = 'keyword-tag-remove';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => {
                this.removeKeywordTag(keyword);
            });
            
            tag.appendChild(text);
            tag.appendChild(removeBtn);
            fragment.appendChild(tag);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    /**
     * دریافت کلمات کلیدی
     */
    getKeywords() {
        return {
            mainKeyword: this.normalizeKeyword(this.elements.mainKeyword.value),
            secondaryKeywords: [...this.secondaryKeywordsArray]
        };
    }
    
    /**
     * تنظیم کلمات کلیدی
     */
    setKeywords(mainKeyword, secondaryKeywords = []) {
        this.elements.mainKeyword.value = this.normalizeKeyword(mainKeyword);
        this.secondaryKeywordsLookup.clear();
        this.secondaryKeywordsArray = [];
        
        secondaryKeywords.forEach(keyword => {
            this.addSecondaryKeyword(keyword, { showMessage: false, triggerChange: false, render: false });
        });
        
        this.renderKeywordTags();
    }
    
    /**
     * نمایش پیام موقت
     * ✅ بهبود: پاک کردن پیام‌های قبلی قبل از نمایش پیام جدید
     */
    showTemporaryMessage(message, type = 'info') {
        // ✅ پاک کردن تمام پیام‌های قبلی
        const existingMessages = document.querySelectorAll('.temporary-message');
        existingMessages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
        
        // ✅ پاک کردن timeout های قبلی
        if (this._messageTimeout) {
            clearTimeout(this._messageTimeout);
        }
        
        const colors = {
            success: '#10b981',
            warning: '#f59e0b',
            info: '#667eea'
        };
        
        const messageEl = document.createElement('div');
        messageEl.className = `temporary-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: 'Vazir', Tahoma, sans-serif;
            font-size: 14px;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        // ✅ ذخیره timeout برای امکان پاک کردن
        this._messageTimeout = setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
                this._messageTimeout = null;
            }, 300);
        }, 3000);
    }

    /**
     * ✅ اصلاح شده: افزودن کلمه کلیدی فرعی با sync
     */
    addSecondaryKeyword(keyword, { triggerChange = true, render = true } = {}) {
        // ✅ sync lookup قبل از چک duplicate
        this.syncLookupFromArray();
        
        const formattedKeyword = this.normalizeKeyword(keyword);
        if (!formattedKeyword) {
            return { status: 'empty' };
        }
        
        const canonical = this.getCanonicalKeyword(formattedKeyword);
        if (this.secondaryKeywordsLookup.has(canonical)) {
            return { status: 'duplicate', keyword: formattedKeyword };
        }
        
        this.secondaryKeywordsArray.push(formattedKeyword);
        this.secondaryKeywordsLookup.add(canonical);
        if (render) {
            this.renderKeywordTags();
        }
        
        if (triggerChange && this.onChangeCallback) {
            this.onChangeCallback();
        }
        
        return { status: 'added', keyword: formattedKeyword };
    }

    /**
     * ✅ اصلاح شده: نرمال‌سازی کلمه کلیدی با حذف HTML
     */
    normalizeKeyword(keyword = '') {
        if (!keyword) return '';
        
        // 1. حذف HTML tags
        const temp = document.createElement('div');
        temp.innerHTML = keyword;
        let text = temp.textContent || temp.innerText || '';
        
        // 2. حذف ZWJ و normalize ZWNJ
        text = text
            .replace(/\u200d/g, '') // حذف ZWJ
            .replace(/\u200c{2,}/g, '\u200c') // چند نیم‌فاصله -> یک نیم‌فاصله
            .replace(/\u200c\s+|\s+\u200c/g, ' '); // نیم‌فاصله + فاصله -> فاصله
        
        // 3. حذف فاصله‌های اضافی
        text = text
            .replace(/\s+/g, ' ')
            .trim();
        
        return text;
    }
    
    /**
     * ✅ اصلاح شده: canonical برای مقایسه دقیق
     */
    getCanonicalKeyword(keyword = '') {
        let normalized = this.normalizeKeyword(keyword);
        
        // تبدیل به lowercase برای مقایسه case-insensitive
        normalized = normalized.toLowerCase();
        
        // حذف تمام نیم‌فاصله‌ها برای مقایسه
        normalized = normalized.replace(/\u200c/g, '');
        
        // حذف فاصله‌های اضافی (دوباره برای اطمینان)
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        return normalized;
    }
    
    /**
     * همگام‌سازی lookup با array
     */
    syncLookupFromArray() {
        this.secondaryKeywordsLookup.clear();
        this.secondaryKeywordsArray.forEach(keyword => {
            const canonical = this.getCanonicalKeyword(keyword);
            this.secondaryKeywordsLookup.add(canonical);
        });
    }
}

export default KeywordsInput;