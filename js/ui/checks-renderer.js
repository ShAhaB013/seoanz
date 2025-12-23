/**
 * رندر کننده چک‌های SEO و خوانایی
 * ✅ اصلاح شده: جلوگیری از duplicate click events
 */

import { STATUS_ICONS } from '../config/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export class ChecksRenderer {
    constructor(modalManager) {
        this.modalManager = modalManager;
        this.elements = {
            checksList: null,
            readabilityChecks: null,
            suggestionsContent: null,
            wordCount: null,
            keywordCount: null
        };
        
        // ذخیره وضعیت toggle برای هر چک
        this.toggleStates = new Map();
        
        // ✅ ذخیره چک‌های خوانایی برای دسترسی به داده‌های پاراگراف
        this.lastReadabilityChecks = [];
    }
    
    /**
     * مقداردهی اولیه
     */
    init() {
        this.cacheElements();
    }
    
    /**
     * کش کردن المان‌ها
     */
    cacheElements() {
        this.elements.checksList = document.getElementById('checksList');
        this.elements.readabilityChecks = document.getElementById('readabilityChecks');
        this.elements.suggestionsContent = document.getElementById('suggestionsContent');
        this.elements.wordCount = document.getElementById('wordCount');
        this.elements.keywordCount = document.getElementById('keywordCount');
    }
    
    /**
     * رندر چک‌های SEO
     */
    renderSEOChecks(checks) {
        this.renderChecks(checks, this.elements.checksList, false);
    }
    
    /**
     * رندر چک‌های خوانایی
     */
    renderReadabilityChecks(checks) {
        // ✅ ذخیره چک‌های خوانایی برای دسترسی بعدی
        this.lastReadabilityChecks = checks || [];
        this.renderChecks(checks, this.elements.readabilityChecks, true);
    }
    
    /**
     * رندر چک‌ها
     * ✅ اصلاح شده: Clone container برای حذف event listeners قدیمی
     */
    renderChecks(checks, container, isReadability = false) {
        if (!container) return;
        
        // ✅ راه حل اصولی: Clone container برای حذف تمام event listeners قدیمی
        const newContainer = container.cloneNode(false); // فقط خود container (بدون children)
        container.parentNode.replaceChild(newContainer, container);
        container = newContainer;
        
        // به‌روزرسانی reference در elements
        if (isReadability) {
            this.elements.readabilityChecks = container;
        } else {
            // بررسی اینکه کدام container است
            if (container.id === 'checksList') {
                this.elements.checksList = container;
            } else if (container.id === 'suggestionsContent') {
                this.elements.suggestionsContent = container;
            }
        }
        
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        
        if (isReadability) {
            tempDiv.innerHTML = checks.map(check => this.createReadabilityCheckHTML(check)).join('');
        } else {
            tempDiv.innerHTML = checks.map(check => this.createCheckHTML(check)).join('');
        }
        
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
        
        container.innerHTML = '';
        container.appendChild(fragment);
        
        // اتصال event listeners (حالا فقط یکبار روی container جدید)
        this.attachCheckEventListeners(container, isReadability);
        
        // ✅ اگر چک خوانایی است، event listener برای clearHighlights اضافه کن
        if (isReadability) {
            this.attachHighlightClearListener();
        }
    }
    
    /**
     * ✅ اتصال listener برای پاک کردن هایلایت
     */
    attachHighlightClearListener() {
        // جلوگیری از اضافه کردن listener تکراری
        if (this._highlightClearListenerAttached) return;
        this._highlightClearListenerAttached = true;
        
        document.addEventListener('clearHighlights', (e) => {
            const { checkId } = e.detail || {};
            const targetIds = checkId 
                ? [checkId] 
                : Array.from(this.toggleStates.entries())
                    .filter(([_, value]) => value === true)
                    .map(([key]) => key);
            
            targetIds.forEach(id => {
                if (!id) return;
                const toggleState = this.toggleStates.get(id);
                if (toggleState === true) {
                    this.toggleStates.set(id, false);
                    
                    const checkItem = document.querySelector(`[data-check-id="${id}"]`);
                    if (checkItem) {
                        const toggleButton = checkItem.querySelector('.check-toggle');
                        if (toggleButton) {
                            toggleButton.classList.remove('active');
                            toggleButton.innerHTML = '👁️';
                            toggleButton.setAttribute('title', 'فعال کردن هایلایت پاراگراف‌های طولانی');
                        }
                    }
                }
            });
        });
    }
    
    /**
     * ساخت HTML چک عادی
     */
    createCheckHTML(check) {
        const icon = STATUS_ICONS[check.status];
        const escapedTitle = escapeHtml(check.title);
        const escapedTooltip = escapeHtml(check.tooltip);
        
        const suggestionsHTML = this.buildSuggestionsHTML(check);
        
        return `
            <div class="check-item" data-check-id="${check.id || this.generateCheckId(check)}">
                <div class="check-header">
                    <div class="check-icon ${check.status}">${icon}</div>
                    <div class="check-title">${check.title}</div>
                    ${this.buildToggleButtonIfNeeded(check)}
                    <div class="check-info" data-title="${escapedTitle}" data-tooltip="${escapedTooltip}">ℹ</div>
                </div>
                <div class="check-desc">${check.desc}</div>
                ${this.formatCheckDetail(check.detail)}
                ${suggestionsHTML}
            </div>
        `;
    }
    
    /**
     * ساخت HTML چک خوانایی
     */
    createReadabilityCheckHTML(check) {
        const icon = STATUS_ICONS[check.status];
        const escapedTitle = escapeHtml(check.title);
        const escapedTooltip = escapeHtml(check.tooltip);
        
        return `
            <div class="readability-check-item" data-check-id="${check.id || this.generateCheckId(check)}">
                <div class="readability-check-header">
                    <div class="readability-check-icon ${check.status}">${icon}</div>
                    <div class="readability-check-title">${check.title}</div>
                    ${this.buildToggleButtonIfNeeded(check)}
                    <div class="check-info" data-title="${escapedTitle}" data-tooltip="${escapedTooltip}">ℹ</div>
                </div>
                <div class="readability-check-desc">${check.desc}</div>
                ${this.formatCheckDetail(check.detail)}
            </div>
        `;
    }
    
    /**
     * ساخت HTML پیشنهادات کلمات کلیدی
     */
    buildSuggestionsHTML(check) {
        if (!check.suggestions || check.suggestions.length === 0) return '';
        
        const suggestionsClass = check.title.includes('اصلی') ? 'main-keyword-suggestions' : 
                               check.title.includes('فرعی') ? 'secondary-keyword-suggestions' : 
                               'keyword-suggestions';
        
        const items = check.suggestions.map(s => `
            <div class="keyword-suggestion-item" data-keyword="${escapeHtml(s.keyword)}">
                <div class="keyword-suggestion-text">${escapeHtml(s.keyword)}</div>
                <div class="keyword-suggestion-meta">
                    <span class="keyword-suggestion-count">${s.frequency}</span>
                    <span class="keyword-suggestion-type">${s.type}</span>
                    ${s.quality ? `<span class="keyword-suggestion-quality">Q:${s.quality}</span>` : ''}
                    ${s.relevance ? `<span class="keyword-suggestion-relevance">R:${s.relevance}</span>` : ''}
                </div>
            </div>
        `).join('');
        
        return `<div class="keyword-suggestions ${suggestionsClass}">${items}</div>`;
    }
    
    /**
     * ✅ ساخت دکمه Toggle فقط برای چک‌هایی که پاراگراف طولانی دارند
     * ✅ بهبود: دکمه همیشه فعال است (disable نمی‌شود)
     */
    buildToggleButtonIfNeeded(check) {
        // ✅ فقط برای Paragraph Length Analyzer
        if (check.title && check.title.includes('طول پاراگراف')) {
            if (!this.hasLongParagraphs(check)) {
                return '';
            }
            const checkId = check.id || this.generateCheckId(check);
            const isActive = this.toggleStates.get(checkId) || false;
            
            const icon = isActive ? '👁️‍🗨️' : '👁️';
            const title = isActive ? 'غیرفعال کردن هایلایت' : 'فعال کردن هایلایت پاراگراف‌های طولانی';
            
            // ✅ همیشه دکمه را فعال نمایش بده (حتی اگر پاراگراف طولانی وجود نداشته باشد)
            return `
                <div class="check-toggle ${isActive ? 'active' : ''}" 
                     data-check-id="${checkId}"
                     data-check-title="${escapeHtml(check.title)}"
                     title="${title}">
                    ${icon}
                </div>
            `;
        }
        return '';
    }
    
    /**
     * ✅ بررسی وجود پاراگراف‌های طولانی در چک
     * ✅ بهینه: حذف لاگ‌های اضافی
     */
    hasLongParagraphs(check) {
        if (!check.detail || !check.detail.paragraphs) {
            return false;
        }
        
        return Array.isArray(check.detail.paragraphs) && check.detail.paragraphs.length > 0;
    }
    
    /**
     * ✅ فرمت کردن check.detail برای نمایش در HTML
     * جلوگیری از نمایش [object Object]
     */
    formatCheckDetail(detail) {
        if (!detail) return '';
        
        // اگر string است، مستقیماً برگردان
        if (typeof detail === 'string') {
            return `<div class="check-detail">${escapeHtml(detail)}</div>`;
        }
        
        // اگر object است، فقط فیلدهای قابل نمایش را نشان بده
        if (typeof detail === 'object' && detail !== null) {
            // اگر paragraphs وجود دارد، آن را نمایش نده (برای هایلایت استفاده می‌شود)
            const { paragraphs, stats, ...displayFields } = detail;
            
            // ✅ اگر stats وجود دارد، فیلدهای آن را هم اضافه کن
            let statsFields = {};
            if (stats && typeof stats === 'object') {
                statsFields = {
                    'standardCount': stats.standardCount || 0,
                    'acceptableCount': stats.acceptableCount || 0,
                    'longCount': stats.longCount || 0,
                    'unsuitableCount': stats.unsuitableCount || 0
                };
            }
            
            // ادغام فیلدها
            const allFields = { ...displayFields, ...statsFields };
            
            // اگر فیلد قابل نمایشی وجود ندارد، چیزی نمایش نده
            if (Object.keys(allFields).length === 0) {
                return '';
            }
            
            // فیلدهای قابل نمایش را به صورت متن فرمت کن
            const detailText = Object.entries(allFields)
                .filter(([key, value]) => {
                    // فقط فیلدهایی که string یا number هستند را نمایش بده
                    return (typeof value === 'string' || typeof value === 'number') && value !== null && value !== undefined;
                })
                .map(([key, value]) => {
                    // تبدیل key به فارسی
                    const keyLabel = this.getFieldLabel(key);
                    // ✅ برای درصد، علامت % اضافه کن
                    if (key === 'longPercentage') {
                        return `${keyLabel}: ${value}%`;
                    }
                    return `${keyLabel}: ${value}`;
                })
                .join('<br>');
            
            if (detailText) {
                return `<div class="check-detail">${detailText}</div>`;
            }
        }
        
        return '';
    }
    
    /**
     * ✅ تبدیل نام فیلد به برچسب فارسی (اختیاری)
     */
    getFieldLabel(key) {
        const labels = {
            'totalParagraphs': 'تعداد کل پاراگراف‌ها',
            'longPercentage': 'درصد پاراگراف‌های طولانی',
            'stats': 'آمار'
        };
        return labels[key] || key;
    }
    
    /**
     * تولید ID یکتا برای چک
     */
    generateCheckId(check) {
        return btoa(encodeURIComponent(check.title)).substring(0, 12);
    }
    
    /**
     * ✅ اتصال event listeners به چک‌ها (اصلاح شده)
     * 🔧 تغییر: اضافه کردن e.stopPropagation() برای جلوگیری از duplicate events
     */
    attachCheckEventListeners(container, isReadability) {
        if (!container || !container.parentNode) return;
        
        // Event delegation
        container.addEventListener('click', (e) => {
            // کلیک روی آیکون اطلاعات
            const infoIcon = e.target.closest('.check-info');
            if (infoIcon) {
                e.stopPropagation(); // ✅ جلوگیری از bubble
                const title = infoIcon.getAttribute('data-title');
                const tooltip = infoIcon.getAttribute('data-tooltip');
                this.modalManager.show(title, tooltip);
                return;
            }
            
            // کلیک روی دکمه toggle
            const toggleButton = e.target.closest('.check-toggle');
            if (toggleButton) {
                e.stopPropagation(); // ✅ جلوگیری از bubble
                const checkId = toggleButton.getAttribute('data-check-id');
                const checkTitle = toggleButton.getAttribute('data-check-title');
                this.handleToggleClick(checkId, checkTitle, toggleButton, container);
                return;
            }
            
            // ✅ کلیک روی پیشنهاد کلمه کلیدی (اصلاح شده)
            const suggestionItem = e.target.closest('.keyword-suggestion-item');
            if (suggestionItem) {
                e.stopPropagation(); // ✅ جلوگیری از bubble
                e.preventDefault(); // ✅ جلوگیری از default action
                
                const keyword = suggestionItem.getAttribute('data-keyword');
                
                // این event را به UI Controller ارسال می‌کنیم با originalEvent
                const customEvent = new CustomEvent('keywordSuggestionClick', { 
                    detail: { 
                        keyword,
                        originalEvent: e 
                    } 
                });
                document.dispatchEvent(customEvent);
            }
        });
    }
    
    /**
     * مدیریت کلیک روی دکمه toggle
     * ✅ بهبود: بررسی وجود پاراگراف قبل از فعال کردن
     */
    handleToggleClick(checkId, checkTitle, toggleButton, container) {
        const isCurrentlyActive = this.toggleStates.get(checkId) || false;
        
        const paragraphsData = this.extractParagraphsData(container, checkId) || [];
        
        const newState = !isCurrentlyActive;
        
        // ✅ ذخیره وضعیت جدید
        this.toggleStates.set(checkId, newState);
        
        // ✅ اگر یک چک جدید را فعال می‌کنیم، چک قبلی را غیرفعال کن
        if (newState) {
            this.toggleStates.forEach((value, key) => {
                if (key !== checkId && value === true) {
                    this.toggleStates.set(key, false);
                    // Dispatch event برای غیرفعال کردن چک قبلی
                    const event = new CustomEvent('highlightToggleOff', {
                        detail: { checkId: key, checkTitle: '' }
                    });
                    document.dispatchEvent(event);
                }
            });
        }
        
        // به‌روزرسانی UI دکمه
        toggleButton.classList.toggle('active', newState);
        toggleButton.innerHTML = newState ? '👁️‍🗨️' : '👁️';
        toggleButton.setAttribute('title', newState ? 'غیرفعال کردن هایلایت' : 'فعال کردن هایلایت پاراگراف‌های طولانی');
        
        // ✅ Dispatch event برای اعلام تغییر وضعیت
        const eventName = newState ? 'highlightToggleOn' : 'highlightToggleOff';
        const event = new CustomEvent(eventName, {
            detail: {
                checkId: checkId,
                checkTitle: checkTitle,
                paragraphs: paragraphsData
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * ✅ استخراج داده‌های پاراگراف‌ها از چک (اصلاح‌شده)
     * ✅ بهینه: حذف لاگ‌های اضافی
     */
    extractParagraphsData(container, checkId) {
        // ✅ پیدا کردن check اصلی از lastReadabilityChecks
        const check = this.lastReadabilityChecks.find(c => {
            const checkItemId = c.id || this.generateCheckId(c);
            return checkItemId === checkId;
        });
        
        if (!check) {
            return [];
        }
        
        // ✅ برگرداندن داده‌های واقعی پاراگراف‌ها
        return check.detail?.paragraphs || [];
    }
    
    /**
     * به‌روزرسانی آمار
     */
    updateStats(totalWords, keywordCount) {
        if (this.elements.wordCount) {
            this.elements.wordCount.textContent = totalWords;
        }
        if (this.elements.keywordCount) {
            this.elements.keywordCount.textContent = keywordCount;
        }
    }
    
    /**
     * پاک کردن چک‌ها
     */
    clearChecks() {
        if (this.elements.checksList) {
            this.elements.checksList.innerHTML = '';
        }
        if (this.elements.readabilityChecks) {
            this.elements.readabilityChecks.innerHTML = '';
        }
        if (this.elements.suggestionsContent) {
            this.elements.suggestionsContent.innerHTML = '';
        }
        
        // ✅ پاک کردن وضعیت toggle
        this.toggleStates.clear();
        
        // ✅ پاک کردن چک‌های ذخیره‌شده
        this.lastReadabilityChecks = [];
    }
    
    /**
     * نمایش پیام خالی
     */
    showEmptyMessage(container, message) {
        if (!container) return;
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                <div style="font-size: 16px;">${message}</div>
            </div>
        `;
    }
}

export default ChecksRenderer;
