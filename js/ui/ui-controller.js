/**
 * کنترلر اصلی UI
 * هماهنگی بین تمام ماژول‌های UI
 */

import ScoreDisplay from './score-display.js';
import TabsManager from './tabs-manager.js';
import ModalManager from './modal-manager.js';
import KeywordsInput from './keywords-input.js';
import ChecksRenderer from './checks-renderer.js';

export class UIController {
    constructor(editorManager) {
        this.editorManager = editorManager;
        
        // ماژول‌های UI
        this.scoreDisplay = null;
        this.tabsManager = null;
        this.modalManager = null;
        this.keywordsInput = null;
        this.checksRenderer = null;
        
        // ذخیره آخرین نتایج تحلیل
        this.lastAnalysisData = null;
        this.lastReadabilityChecks = [];
        
        // ✅ ذخیره وضعیت هایلایت فعال
        this.highlightedCheckId = null;
        this.lastHighlightData = [];
        
        // Callback برای تغییرات
        this.onChangeCallback = null;
    }
    
    /**
     * مقداردهی اولیه
     */
    init(onChangeCallback) {
        this.onChangeCallback = onChangeCallback;
        
        // مقداردهی ماژول‌ها
        this.scoreDisplay = new ScoreDisplay();
        this.scoreDisplay.init();
        
        this.tabsManager = new TabsManager();
        this.tabsManager.init();
        
        this.modalManager = new ModalManager();
        this.modalManager.init();
        
        this.keywordsInput = new KeywordsInput(() => {
            if (this.onChangeCallback) {
                this.onChangeCallback();
            }
        });
        this.keywordsInput.init();
        
        this.checksRenderer = new ChecksRenderer(this.modalManager);
        this.checksRenderer.init();
        
        // Event listeners سراسری
        this.attachGlobalListeners();
        
        console.log('✅ UI Controller راه‌اندازی شد');
    }
    
    /**
     * اتصال event listener های سراسری
     * ✅ بهبود: جلوگیری از اضافه کردن listener تکراری
     */
    attachGlobalListeners() {
        // ✅ جلوگیری از اضافه کردن listener تکراری
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        
        // کلیک روی پیشنهاد کلمه کلیدی
        document.addEventListener('keywordSuggestionClick', (e) => {
            this.handleKeywordSuggestionClick(e.detail.keyword, e.detail.originalEvent);
        });
        
        // Eventهای toggle highlight
        document.addEventListener('highlightToggleOn', (e) => {
            this.handleHighlightToggle(true, e.detail);
        });
        
        document.addEventListener('highlightToggleOff', (e) => {
            this.handleHighlightToggle(false, e.detail);
        });
        
        document.addEventListener('clearHighlights', (e) => {
            this.handleClearHighlights(e.detail.checkId);
        });
        
        // ✅ Event برای دوباره اعمال کردن هایلایت بعد از تغییر محتوا
        document.addEventListener('reapplyHighlight', (e) => {
            this.handleReapplyHighlight();
        });
    }
    
    /**
     * به‌روزرسانی نتایج تحلیل
     */
    updateAnalysisResults(analysisData) {
        const { seoChecks, readabilityChecks, stats, score } = analysisData;
        
        // ذخیره داده‌ها
        this.lastAnalysisData = analysisData;
        this.lastReadabilityChecks = readabilityChecks;
        
        this.scoreDisplay.updateScore(score);
        this.checksRenderer.updateStats(stats.totalWords, stats.keywordCount);
        this.checksRenderer.renderSEOChecks(seoChecks);
        this.checksRenderer.renderReadabilityChecks(readabilityChecks);
        
        this.tabsManager.updateBadge('seo', this.countErrors(seoChecks));
        this.tabsManager.updateBadge('readability', this.countErrors(readabilityChecks));
        
        // ✅ اگر هایلایت فعال داریم و پاراگراف‌ها تغییر کرده، هایلایت را به‌روزرسانی کن
        if (this.highlightedCheckId) {
            const paragraphCheck = readabilityChecks.find(check => {
                const checkItemId = check.id || this.generateCheckId(check);
                return (checkItemId === this.highlightedCheckId || check.id === this.highlightedCheckId) && 
                       check.title && check.title.includes('طول پاراگراف');
            });
            
            if (paragraphCheck && paragraphCheck.detail && paragraphCheck.detail.paragraphs) {
                this.lastHighlightData = paragraphCheck.detail.paragraphs;
                // اگر پاراگراف‌های طولانی وجود دارد، هایلایت را دوباره اعمال کن
                if (paragraphCheck.detail.paragraphs.length > 0) {
                    const applied = this.editorManager.highlightLongParagraphs(paragraphCheck.detail.paragraphs);
                    if (applied && applied.length > 0) {
                        this.lastHighlightData = applied;
                    } else {
                        this.lastHighlightData = paragraphCheck.detail.paragraphs;
                    }
                } else {
                    // اگر دیگر پاراگرافی وجود ندارد، هایلایت را غیرفعال کن
                    this.handleClearHighlights(this.highlightedCheckId);
                    // همچنین toggle را غیرفعال کن
                    const clearEvent = new CustomEvent('clearHighlights', {
                        detail: { checkId: this.highlightedCheckId }
                    });
                    document.dispatchEvent(clearEvent);
                }
            } else {
                this.lastHighlightData = [];
                // اگر چک دیگر وجود ندارد، هایلایت را پاک کن
                this.handleClearHighlights(this.highlightedCheckId);
            }
        }
    }
    
    /**
     * نمایش حالت بدون کلمه کلیدی
     */
    showNoKeywordState() {
        this.scoreDisplay.showNoKeyword();
        this.checksRenderer.updateStats(0, 0);
        this.checksRenderer.clearChecks();
        
        this.dispatchClearHighlights(this.highlightedCheckId || null);
    }
    
    /**
     * نمایش حالت پیشنهادات
     */
    showSuggestionsState(suggestions, wordCount) {
        this.scoreDisplay.showSuggestions();
        this.checksRenderer.updateStats(wordCount, 0);
        
        // نمایش پیام در تب SEO
        const message = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">💡</div>
                <div style="font-size: 16px; font-weight: 600; color: #667eea; margin-bottom: 10px;">
                    پیشنهادات کلمه کلیدی آماده است!
                </div>
                <div style="font-size: 14px; color: #6c757d; line-height: 1.8;">
                    ${suggestions.mainKeywords.length} پیشنهاد برای کلمه کلیدی اصلی<br>
                    ${suggestions.secondaryKeywords.length} پیشنهاد برای کلمات کلیدی فرعی<br><br>
                    👉 به تب <strong>"پیشنهادات"</strong> بروید و روی هر کلمه کلیک کنید
                </div>
            </div>
        `;
        
        const checksListEl = document.getElementById('checksList');
        if (checksListEl) {
            checksListEl.innerHTML = message;
        }
        
        // رندر پیشنهادات در تب پیشنهادات
        this.renderSuggestions(suggestions);
        
        this.dispatchClearHighlights(this.highlightedCheckId || null);
    }
    
    /**
     * رندر پیشنهادات
     */
    renderSuggestions(suggestions) {
        const checks = [];
        
        if (suggestions.mainKeywords && suggestions.mainKeywords.length > 0) {
            checks.push({
                status: 'success',
                title: 'تشخیص کلمه کلیدی اصلی',
                tooltip: 'کلمه کلیدی اصلی مهم‌ترین عبارت در محتوا است که باید در عنوان، پاراگراف اول و چندین بار در متن تکرار شود.',
                desc: `${suggestions.mainKeywords.length} پیشنهاد یافت شد`,
                detail: suggestions.mainKeywords.map(s => 
                    `${s.keyword}: ${s.frequency} بار (کیفیت: ${s.quality}, ارتباط: ${s.relevance})`
                ).join('\n'),
                suggestions: suggestions.mainKeywords
            });
        }
        
        if (suggestions.secondaryKeywords && suggestions.secondaryKeywords.length > 0) {
            checks.push({
                status: 'success',
                title: 'تشخیص کلمات کلیدی فرعی',
                tooltip: 'کلمات کلیدی فرعی عبارات مرتبط با موضوع اصلی هستند که به بهبود سئو و جذب ترافیک بیشتر کمک می‌کنند.',
                desc: `${suggestions.secondaryKeywords.length} پیشنهاد یافت شد`,
                detail: suggestions.secondaryKeywords.map(s => 
                    `${s.keyword}: ${s.frequency} بار (کیفیت: ${s.quality}, ارتباط: ${s.relevance})`
                ).join('\n'),
                suggestions: suggestions.secondaryKeywords
            });
        }
        
        // رندر در تب پیشنهادات
        const suggestionsContent = document.getElementById('suggestionsContent');
        if (suggestionsContent && checks.length > 0) {
            this.checksRenderer.renderChecks(checks, suggestionsContent, false);
        }
    }
    
    /**
     * مدیریت کلیک روی پیشنهاد کلمه کلیدی
     */
    handleKeywordSuggestionClick(keyword, originalEvent = null) {
        // اگر event ارسال شده، از آن استفاده کن
        let clickedElement = null;
        if (originalEvent && originalEvent.target) {
            clickedElement = originalEvent.target.closest('.keyword-suggestion-item');
        } else {
            // fallback: پیدا کردن المان از طریق keyword
            const items = document.querySelectorAll('.keyword-suggestion-item');
            for (let item of items) {
                if (item.getAttribute('data-keyword') === keyword) {
                    clickedElement = item;
                    break;
                }
            }
        }
        
        if (!clickedElement) return;
        
        const displayKeyword = (keyword || '').trim();
        const normalizedKeyword = this.normalizeKeywordInput(keyword);
        if (!normalizedKeyword) return;
        
        const parentSuggestions = clickedElement.closest('.keyword-suggestions');
        const isMainKeywordSuggestion = parentSuggestions && parentSuggestions.classList.contains('main-keyword-suggestions');
        const isSecondaryKeywordSuggestion = parentSuggestions && parentSuggestions.classList.contains('secondary-keyword-suggestions');

        const currentKeywords = this.keywordsInput.getKeywords();
        
        if (isMainKeywordSuggestion || !currentKeywords.mainKeyword) {
            this.keywordsInput.setKeywords(normalizedKeyword, currentKeywords.secondaryKeywords);
            this.keywordsInput.showTemporaryMessage('کلمه کلیدی اصلی تنظیم شد: ' + (displayKeyword || normalizedKeyword), 'success');
            
        } else if (isSecondaryKeywordSuggestion) {
            const result = this.keywordsInput.addSecondaryKeyword(normalizedKeyword);
            if (result.status === 'added') {
                this.keywordsInput.showTemporaryMessage('کلمه کلیدی فرعی اضافه شد: ' + (displayKeyword || normalizedKeyword), 'success');
            } else if (result.status === 'duplicate') {
                this.keywordsInput.showTemporaryMessage('این کلمه قبلاً اضافه شده است', 'warning');
            }
            
        } else {
            const result = this.keywordsInput.addSecondaryKeyword(normalizedKeyword);
            if (result.status === 'added') {
                this.keywordsInput.showTemporaryMessage('کلمه کلیدی فرعی اضافه شد: ' + (displayKeyword || normalizedKeyword), 'success');
            } else if (result.status === 'duplicate') {
                this.keywordsInput.showTemporaryMessage('این کلمه قبلاً اضافه شده است', 'warning');
            }
        }
        
        // اجرای تحلیل مجدد
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }
    
    /**
     * مدیریت toggle highlight
     * بهبود یافته: استفاده از داده‌های event و fallback به lastReadabilityChecks
     */
    handleHighlightToggle(isActive, detail) {
        const { checkId, checkTitle, paragraphs } = detail;
        
        // ✅ فقط برای Paragraph Length Analyzer
        if (!checkTitle || !checkTitle.includes('طول پاراگراف')) return;
        
        if (isActive) {
            let paragraphsData = paragraphs;
            
            // ✅ اگر داده‌های پاراگراف در event نبود، از lastReadabilityChecks بگیر
            if (!paragraphsData || paragraphsData.length === 0) {
                const paragraphCheck = this.lastReadabilityChecks.find(check => {
                    const checkItemId = check.id || this.generateCheckId(check);
                    return checkItemId === checkId || (check.title && check.title.includes('طول پاراگراف'));
                });
                
                if (paragraphCheck && paragraphCheck.detail && paragraphCheck.detail.paragraphs) {
                    paragraphsData = paragraphCheck.detail.paragraphs;
                }
            }
            
            // ✅ اعمال هایلایت
            if (paragraphsData && paragraphsData.length > 0) {
                const applied = this.editorManager.highlightLongParagraphs(paragraphsData);
                if (applied && applied.length > 0) {
                    this.lastHighlightData = applied;
                } else {
                    this.lastHighlightData = paragraphsData;
                }
                this.highlightedCheckId = checkId;
            } else {
                const applied = this.editorManager.highlightLongParagraphs([], { recomputeFromEditor: true });
                if (applied && applied.length > 0) {
                    this.lastHighlightData = applied;
                    this.highlightedCheckId = checkId;
                } else {
                    this.lastHighlightData = [];
                    const clearEvent = new CustomEvent('clearHighlights', {
                        detail: { checkId: checkId }
                    });
                    document.dispatchEvent(clearEvent);
                }
            }
        } else {
            // ✅ غیرفعال کردن هایلایت
            this.lastHighlightData = [];
            this.handleClearHighlights(checkId);
        }
    }
    
    /**
     * ✅ تولید ID یکتا برای چک (کمکی)
     */
    generateCheckId(check) {
        return btoa(encodeURIComponent(check.title)).substring(0, 12);
    }
    
    /**
     * ✅ دوباره اعمال کردن هایلایت بعد از تغییر محتوا یا format
     */
    handleReapplyHighlight() {
        // ✅ اگر هایلایت فعال است، دوباره اعمال کن
        if (this.highlightedCheckId) {
            const paragraphCheck = this.lastReadabilityChecks.find(check => {
                const checkItemId = check.id || this.generateCheckId(check);
                return checkItemId === this.highlightedCheckId || 
                       (check.title && check.title.includes('طول پاراگراف'));
            });
            const paragraphs = paragraphCheck && paragraphCheck.detail && Array.isArray(paragraphCheck.detail.paragraphs)
                ? paragraphCheck.detail.paragraphs
                : this.lastHighlightData;
            
            if (paragraphs && paragraphs.length > 0) {
                // ✅ تنظیم فلگ برای جلوگیری از cleanup
                this.editorManager.isApplyingHighlight = true;
                
                // ✅ کمی تاخیر برای اطمینان از اینکه محتوا به‌روزرسانی شده
                setTimeout(() => {
                    // ✅ از داده‌های اصلی استفاده کن (تطبیق خودکار انجام می‌شود)
                    const applied = this.editorManager.highlightLongParagraphs(paragraphs, { recomputeFromEditor: true });
                    if (applied && applied.length > 0) {
                        this.lastHighlightData = applied;
                    } else {
                        this.lastHighlightData = paragraphs;
                    }
                    
                    // ✅ به‌روزرسانی محتوای ذخیره‌شده (normalize شده)
                    if (this.editorManager._lastContentForCleanup !== undefined && this.editorManager.instance) {
                        this.editorManager._lastContentForCleanup = this.editorManager.instance.getContent({ format: 'text' })
                            .replace(/\s+/g, ' ')
                            .trim();
                    }
                    
                    // ✅ ریست فلگ
                    setTimeout(() => {
                        this.editorManager.isApplyingHighlight = false;
                    }, 300);
                }, 200);
            } else {
                // ✅ اگر پاراگرافی نیست، از محتوای فعلی دوباره استخراج کن
                const applied = this.editorManager.highlightLongParagraphs([], { recomputeFromEditor: true });
                if (applied && applied.length > 0) {
                    this.lastHighlightData = applied;
                } else {
                    this.lastHighlightData = [];
                    this.handleClearHighlights(this.highlightedCheckId);
                }
            }
        }
    }
    
    /**
     * ✅ استخراج پاراگراف‌های طولانی از محتوای فعلی ویرایشگر
     */
    extractParagraphsFromContent(content, originalParagraphs) {
        // ✅ استفاده از منطق تطبیق موجود در TinyMCE Manager
        // این متد فقط برای تطبیق پاراگراف‌ها استفاده می‌شود
        return originalParagraphs; // برای حالا، از داده‌های اصلی استفاده می‌کنیم
    }
    
    /**
     * پاک کردن هایلایت‌ها
     */
    handleClearHighlights(checkId = null) {
        // ✅ فقط پاک کن اگر این چک هایلایت شده باشد
        if (!checkId || checkId === this.highlightedCheckId) {
            // ✅ قبل از پاک کردن، فلگ را تنظیم کن تا cleanup اجرا نشود
            this.editorManager.isApplyingHighlight = true;
            const fingerprints = this.getParagraphFingerprints(this.lastHighlightData);
            
            this.editorManager.clearHighlights('paragraph-length', fingerprints);
            this.highlightedCheckId = null;
            this.lastHighlightData = [];
            
            // ✅ به‌روزرسانی محتوای ذخیره‌شده برای cleanup
            if (this.editorManager.instance && this.editorManager._lastContentForCleanup !== undefined) {
                setTimeout(() => {
                    this.editorManager._lastContentForCleanup = this.editorManager.instance.getContent({ format: 'text' });
                    this.editorManager.isApplyingHighlight = false;
                }, 200);
            } else {
                setTimeout(() => {
                    this.editorManager.isApplyingHighlight = false;
                }, 200);
            }
        }
    }
    
    /**
     * استخراج fingerprint پاراگراف‌ها
     */
    getParagraphFingerprints(paragraphs = []) {
        if (!Array.isArray(paragraphs)) return [];
        return paragraphs
            .map(p => p && p.fingerprint)
            .filter(fp => typeof fp === 'string' && fp.length > 0);
    }
    
    /**
     * شمارش خطاها
     */
    countErrors(checks) {
        return checks.filter(c => c.status === 'error').length;
    }
    
    /**
     * دریافت کلمات کلیدی
     */
    getKeywords() {
        return this.keywordsInput.getKeywords();
    }
    
    normalizeKeywordInput(keyword = '') {
        return (keyword || '').replace(/\s+/g, ' ').trim();
    }
    
    dispatchClearHighlights(checkId = null) {
        const event = new CustomEvent('clearHighlights', {
            detail: { checkId }
        });
        document.dispatchEvent(event);
    }
}

export default UIController;