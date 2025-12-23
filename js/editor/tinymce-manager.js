/**
 * مدیریت TinyMCE Editor
 */

import { logger } from '../utils/logger.js';
import { debounce } from '../utils/helpers.js';
import { countWords } from '../utils/text-utils.js';
import { SEO_LIMITS } from '../config/constants.js';
import { createParagraphFingerprint, normalizeParagraphText } from '../utils/paragraph-utils.js';

export class TinyMCEManager {
    constructor() {
        this.instance = null;
        this.onContentChangeCallback = null;
        this.isApplyingHighlight = false;
        // ✅ ذخیره وضعیت هایلایت فعال
        this.activeHighlightType = null;
        this.longParagraphState = {
            highlighted: new Map(),
            pendingBatch: null,
            pendingHandle: null,
            batchId: 0
        };
    }
    
    /**
     * مقداردهی اولیه
     */
    async init(onContentChange) {
        this.onContentChangeCallback = onContentChange;
        
        // مدیریت خطاهای TinyMCE
        this.handleTinyMCEErrors();
        
        return new Promise((resolve, reject) => {
                // جلوگیری از دوباره initialize شدن TinyMCE
            if (tinymce.EditorManager.get('editor')) {
        tinymce.EditorManager.get('editor').remove();
            }
            tinymce.init({
                selector: '#editor',
                language: 'fa',
                directionality: 'rtl',
                height: 700,
                branding: false,
                license_key: 'gpl',
                
                // Plugins
                plugins: [
                    'autolink', 'autosave', 'code', 'codesample', 'directionality',
                    'fullscreen', 'help', 'link', 'image', 'lists', 'media',
                    'nonbreaking', 'pagebreak', 'preview', 'quickbars', 'searchreplace',
                    'table', 'visualblocks', 'visualchars', 'wordcount'
                ],
                
                // Menubar
                menubar: 'file edit view insert format tools table help',
                
                // Toolbar
                toolbar_mode: 'sliding',
                toolbar: 
                    'fontfamily blocks fontsizeinput | ' +
                    'bold italic underline | ' +
                    'forecolor backcolor formatpainter | ' +
                    'lineheight alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist | outdent indent | ltr rtl | ' +
                    'link image media | table | searchreplace | preview code fullscreen',
                
                // Font Family
                font_family_formats:
                    'Vazir=Vazir, Tahoma, Arial, sans-serif;' +
                    'Tahoma=Tahoma, Arial, sans-serif;' +
                    'Arial=Arial, sans-serif;' +
                    'Times New Roman=Times New Roman, serif;' +
                    'Courier New=Courier New, monospace;' +
                    'Georgia=Georgia, serif;' +
                    'Verdana=Verdana, sans-serif',
                
                content_style: `
                    @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css');
                    body { 
                        direction: rtl !important; 
                        text-align: right !important; 
                        font-family: 'Vazir', Tahoma, Arial, sans-serif; 
                        line-height: 1.6;
                        font-size: 16px;
                    }
                    p { 
                        font-size: 16px; 
                        margin-bottom: 1em;
                        transition: all 0.3s ease;
                    }
                    p:hover {
                        background: rgba(240, 248, 255, 0.5);
                    }
                    table { 
                        border-collapse: collapse; 
                        width: 100%; 
                    } 
                    table, th, td { 
                        border: 1px solid #ccc; 
                        padding: 4px; 
                    } 
                    img { 
                        max-width: 100%; 
                        height: auto; 
                        display: block; 
                    } 
                    [dir="ltr"] { 
                        direction: ltr; 
                    }
                    /* استایل‌های هایلایت پاراگراف‌های طولانی */
                    .long-paragraph {
                        display: block;
                        width: 100%;
                        box-sizing: border-box;
                        position: relative;
                        background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.12) 100%);
                        border: 2px dashed rgba(239, 68, 68, 0.5) !important;
                        border-radius: 8px;
                        padding: 12px !important;
                        margin: 8px 0 !important;
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
                        transition: all 0.3s ease;
                    }
                    .long-paragraph::before {
                        content: attr(data-word-count) ' کلمه';
                        position: absolute;
                        top: -12px;
                        right: 12px;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        padding: 4px 10px;
                        border-radius: 15px;
                        font-size: 11px;
                        font-weight: 600;
                        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
                        z-index: 10;
                        white-space: nowrap;
                    }
                    .long-paragraph[data-highlight-status="unsuitable"] {
                        background: linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(220, 38, 38, 0.16) 100%);
                        border-color: rgba(220, 38, 38, 0.7) !important;
                    }
                    .long-paragraph[data-highlight-status="unsuitable"]::before {
                        content: '⚠️ ' attr(data-word-count) ' کلمه - بسیار طولانی';
                        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    }
                `,
                
                // Quickbars
                quickbars_insert_toolbar: '',
                quickbars_selection_toolbar: 'bold italic underline link h1 h2 h3 blockquote',
                
                paste_as_text: false,
                paste_data_images: true,
                paste_merge_formats: true,
                paste_webkit_styles: 'all',
                paste_auto_cleanup_on_paste: true,
                paste_remove_styles_if_webkit: false,
                paste_block_drop: false,
                automatic_uploads: false,
                
                setup: (editor) => {
                    editor.on('init', () => {
                        this.instance = editor;
                        window.editorInstance = editor;
                        
                        logger.success('TinyMCE آماده شد');
                        
                        // تنظیم پاک کردن خودکار هایلایت با تاخیر هوشمند
                        this.setupSmartHighlightCleanup();
                        
                        if (this.onContentChangeCallback) {
                            this.onContentChangeCallback();
                        }
                        
                        resolve(editor);
                    });
                    
                    editor.on('input change undo redo', () => {
                        if (this.onContentChangeCallback && !this.isApplyingHighlight) {
                            this.onContentChangeCallback();
                        }
                    });

                    editor.on('paste', () => {
                        if (this.onContentChangeCallback && !this.isApplyingHighlight) {
                            this.onContentChangeCallback();
                        }
                    });
                    
                    editor.on('keyup', debounce(() => {
                        if (this.onContentChangeCallback && !this.isApplyingHighlight) {
                            this.onContentChangeCallback();
                        }
                    }, 500));
                    
                    // ✅ Event برای تغییرات format (rtl/ltr) - فقط هایلایت را دوباره اعمال کن
                    editor.on('ExecCommand', (e) => {
                        // ✅ اگر دستور mceDirectionLtr یا mceDirectionRtl اجرا شد
                        if (e.command === 'mceDirectionLtr' || e.command === 'mceDirectionRtl') {
                            // ✅ تنظیم فلگ برای جلوگیری از cleanup
                            this.isApplyingHighlight = true;
                            
                            // ✅ اگر هایلایت فعال است، فقط دوباره اعمال کن (بدون cleanup)
                            if (this.activeHighlightType === 'paragraph-length') {
                                setTimeout(() => {
                                    const reapplyEvent = new CustomEvent('reapplyHighlight', {
                                        detail: { type: 'paragraph-length' }
                                    });
                                    document.dispatchEvent(reapplyEvent);
                                    
                                    // ✅ به‌روزرسانی محتوای ذخیره‌شده
                                    if (this._lastContentForCleanup !== undefined) {
                                        this._lastContentForCleanup = editor.getContent({ format: 'text' })
                                            .replace(/\s+/g, ' ')
                                            .trim();
                                    }
                                    
                                    // ✅ ریست فلگ
                                    setTimeout(() => {
                                        this.isApplyingHighlight = false;
                                    }, 200);
                                }, 100);
                            } else {
                                // ✅ اگر هایلایت فعال نیست، فقط فلگ را ریست کن
                                setTimeout(() => {
                                    this.isApplyingHighlight = false;
                                }, 100);
                            }
                        }
                    });
                },
                
                // Paste Postprocess
                paste_postprocess: (plugin, args) => {
                    this.handlePastePostprocess(args.node);
                    if (this.onContentChangeCallback) {
                        this.onContentChangeCallback();
                    }
                },
                
                // Image Upload Handler - disable for security reason
                //images_upload_handler: (blobInfo) => {
                  //  return Promise.resolve("data:" + blobInfo.blob().type + ";base64," + blobInfo.base64());
                //}
            });
            
            setTimeout(() => {
                if (!this.instance) {
                    reject(new Error('TinyMCE initialization timeout'));
                }
            }, 10000);
        });
    }
    
    /**
     * پردازش محتوای paste شده
     */
    handlePastePostprocess(node) {
        // 1. حذف wrapperهای اضافی (span/div) فقط برای تصاویر
        node.querySelectorAll("span, div").forEach((wrapper) => {
            const img = wrapper.querySelector('img');
            if (img && wrapper.children.length === 1) {
                const parent = wrapper.parentElement;
                parent.replaceChild(img, wrapper);
            }
        });
        
        // 2. پردازش و alignment تصاویر
        node.querySelectorAll("img").forEach((img) => {
            const parent = img.parentElement;
            if (!parent) return;

            // تشخیص alignment از parent (بدون حساسیت به فاصله)
            const rawStyle = parent.getAttribute("style") || "";
            const styleForMatch = rawStyle.replace(/\s/g, '').toLowerCase();
            
            let align = null;
            if (styleForMatch.includes("text-align:center")) align = "center";
            else if (styleForMatch.includes("text-align:right")) align = "right";
            else if (styleForMatch.includes("text-align:left")) align = "left";
            else if (styleForMatch.includes("text-align:justify")) align = "center";

            // پاک کردن استایل‌های مزاحم از parent (نگه داشتن dir)
            const dir = parent.getAttribute("dir");
            parent.removeAttribute("style");
            if (dir) parent.setAttribute("dir", dir);
            
            // پاک کردن استایل‌های قبلی تصویر
            img.removeAttribute("style");
            img.removeAttribute("class");
            
            // استایل‌های پایه
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            
            // اعمال alignment
            if (align === "center") {
                img.style.display = "block";
                img.style.marginLeft = "auto";
                img.style.marginRight = "auto";
            } else if (align === "right") {
                img.style.cssFloat = "right";
                img.style.margin = "0 15px 15px 0";
            } else if (align === "left") {
                img.style.cssFloat = "left";
                img.style.margin = "0 0 15px 15px";
            } else {
                img.style.display = "block";
            }
            
            // اضافه کردن clearfix بعد از float
            if (align === "left" || align === "right") {
                const clearDiv = document.createElement('div');
                clearDiv.style.clear = 'both';
                const next = parent.nextSibling;
                if (next) {
                    parent.parentNode.insertBefore(clearDiv, next);
                } else {
                    parent.parentNode.appendChild(clearDiv);
                }
            }
        });
        
        // 3. حذف divهای خالی
        node.querySelectorAll("div").forEach((div) => {
            if (!div.textContent.trim() && !div.querySelector('img, table, iframe')) {
                div.remove();
            }
        });
    }
    
    handleTinyMCEErrors() {
        window.addEventListener('error', (e) => {
            if (e.message && e.message.includes('tinymce')) {
                logger.warn('خطای TinyMCE:', e.message);
                e.preventDefault();
            }
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            if (e.reason && e.reason.message && e.reason.message.includes('tinymce')) {
                logger.warn('خطای شبکه TinyMCE:', e.reason.message);
                e.preventDefault();
            }
        });
    }
    
    getInstance() {
        return this.instance;
    }
    
    getContent() {
        return this.instance ? this.instance.getContent() : '';
    }
    
    setContent(content) {
        if (this.instance) {
            this.instance.setContent(content);
        }
    }
    
    getBody() {
        return this.instance ? this.instance.getBody() : null;
    }
    
    clear() {
        if (this.instance) {
            this.instance.setContent('');
        }
    }
    
    isReady() {
        return this.instance !== null;
    }
    
    /**
     * هایلایت کردن پاراگراف‌های طولانی (diff-based + incremental)
     */
    highlightLongParagraphs(paragraphsData = [], options = {}) {
        if (!this.instance) return;
        
        const currentParagraphs = this.getParagraphDataFromEditor();
        const paragraphMap = new Map(currentParagraphs.map(p => [p.fingerprint, p]));
        let analyzerData = paragraphsData || [];
        
        if (options.recomputeFromEditor || analyzerData.length === 0) {
            analyzerData = this.buildAnalyzerDataFromParagraphs(currentParagraphs);
        }
        
        const analyzerMap = new Map(analyzerData.map(p => [p.fingerprint, p]));
        
        const targetFingerprints = new Set();
        
        if (paragraphsData && paragraphsData.length > 0) {
        analyzerData.forEach(p => targetFingerprints.add(p.fingerprint));
        analyzerData.forEach(p => targetFingerprints.add(p.fingerprint));
        } else {
            currentParagraphs
                .filter(p => p.wordCount > SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX)
                .forEach(p => targetFingerprints.add(p.fingerprint));
        }
        
        // اگر پاراگراف طولانی وجود ندارد، هایلایت را پاک کن
        if (targetFingerprints.size === 0) {
        this.clearHighlights('paragraph-length');
            this.activeHighlightType = null;
            return [];
        }
        
        this.isApplyingHighlight = true;
        this.cancelHighlightBatch();
        
        const desiredMap = new Map();
        
        targetFingerprints.forEach(fingerprint => {
            let info = paragraphMap.get(fingerprint);
            
            if (!info) {
                const analyzerInfo = analyzerMap.get(fingerprint);
                if (analyzerInfo) {
                    info = this.findParagraphByAnalyzerInfo(currentParagraphs, analyzerInfo);
                }
            }
            
            if (info && info.node) {
                const analyzerInfo = analyzerMap.get(fingerprint);
                const status = analyzerInfo?.status || (info.wordCount >= SEO_LIMITS.PARAGRAPH_LENGTH_UNSUITABLE_MIN ? 'unsuitable' : 'long');
                desiredMap.set(fingerprint, { ...info, status });
            }
        });
        
        const existingFingerprints = new Set(this.longParagraphState.highlighted.keys());
        const toRemove = Array.from(existingFingerprints).filter(fp => !desiredMap.has(fp));
        if (toRemove.length > 0) {
            this.removeHighlightByFingerprints(toRemove);
        }
        
        const toAddQueue = [];
        desiredMap.forEach((info, fingerprint) => {
            if (!this.longParagraphState.highlighted.has(fingerprint)) {
                toAddQueue.push({ fingerprint, info });
            }
        });

        const appliedSummary = this.buildSummaryFromDesiredMap(desiredMap);
        
        if (toAddQueue.length === 0) {
            this.isApplyingHighlight = false;
            this.activeHighlightType = 'paragraph-length';
            return appliedSummary;
        }
        
        this.activeHighlightType = 'paragraph-length';
        this.startHighlightBatch(toAddQueue);
        
        return appliedSummary;
    }
    
    startHighlightBatch(queue) {
        if (!queue || queue.length === 0) {
            this.isApplyingHighlight = false;
            return;
        }
        
        this.longParagraphState.batchId += 1;
        const batchId = this.longParagraphState.batchId;
        this.longParagraphState.pendingBatch = { id: batchId, queue: [...queue] };
        
        const processChunk = () => {
            if (!this.longParagraphState.pendingBatch || this.longParagraphState.pendingBatch.id !== batchId) {
                return;
            }
            
            const CHUNK_SIZE = 3;
            let processed = 0;
            
            while (processed < CHUNK_SIZE && this.longParagraphState.pendingBatch.queue.length > 0) {
                const { fingerprint, info } = this.longParagraphState.pendingBatch.queue.shift();
                this.applyHighlightToNode(info.node, fingerprint, info.wordCount, info.status);
                processed++;
            }
            
            if (this.longParagraphState.pendingBatch.queue.length === 0) {
                this.longParagraphState.pendingBatch = null;
                this.longParagraphState.pendingHandle = null;
                this.isApplyingHighlight = false;
                
        if (this.instance && this._lastContentForCleanup !== undefined) {
            setTimeout(() => {
                this._lastContentForCleanup = this.instance.getContent({ format: 'text' });
                    }, 200);
                }
                return;
            }
            
            this.scheduleNextHighlightChunk(processChunk);
        };
        
        processChunk();
    }
    
    scheduleNextHighlightChunk(callback) {
        if (!callback) return;
        
        if (this.longParagraphState.pendingHandle) {
            if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof this.longParagraphState.pendingHandle === 'number') {
                window.cancelIdleCallback(this.longParagraphState.pendingHandle);
            } else {
                clearTimeout(this.longParagraphState.pendingHandle);
            }
        }
        
        if (typeof window !== 'undefined' && window.requestIdleCallback) {
            this.longParagraphState.pendingHandle = window.requestIdleCallback(callback, { timeout: 200 });
        } else {
            this.longParagraphState.pendingHandle = setTimeout(callback, 16);
        }
    }
    
    cancelHighlightBatch() {
        if (this.longParagraphState.pendingHandle) {
            if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof this.longParagraphState.pendingHandle === 'number') {
                window.cancelIdleCallback(this.longParagraphState.pendingHandle);
            } else {
                clearTimeout(this.longParagraphState.pendingHandle);
            }
        }
        this.longParagraphState.pendingHandle = null;
        this.longParagraphState.pendingBatch = null;
        this.isApplyingHighlight = false;
    }
    
    applyHighlightToNode(node, fingerprint, wordCount, status = 'long') {
        if (!node || !fingerprint) return;
        
        const existingSpan = node.querySelector(`span.long-paragraph[data-paragraph-fingerprint="${fingerprint}"]`);
        if (existingSpan) {
            existingSpan.setAttribute('data-word-count', wordCount);
            existingSpan.setAttribute('data-highlight-status', status);
            this.longParagraphState.highlighted.set(fingerprint, { node, span: existingSpan });
            return;
        }
        
        const span = node.ownerDocument.createElement('span');
        span.classList.add('long-paragraph');
        span.setAttribute('data-highlight-type', 'paragraph-length');
        span.setAttribute('data-paragraph-fingerprint', fingerprint);
        span.setAttribute('data-word-count', wordCount);
        span.setAttribute('data-highlight-status', status);
        
        while (node.firstChild) {
            span.appendChild(node.firstChild);
        }
        
        node.appendChild(span);
        this.longParagraphState.highlighted.set(fingerprint, { node, span });
    }
    
    removeHighlightByFingerprints(fingerprints = null) {
        const targets = fingerprints && fingerprints.length
            ? fingerprints
            : Array.from(this.longParagraphState.highlighted.keys());
        
        targets.forEach(fingerprint => {
            const entry = this.longParagraphState.highlighted.get(fingerprint);
            if (entry && entry.node && entry.span) {
                const { node, span } = entry;
                while (span.firstChild) {
                    node.insertBefore(span.firstChild, span);
                }
                span.remove();
            }
            this.longParagraphState.highlighted.delete(fingerprint);
        });
        
        if (this.longParagraphState.highlighted.size === 0) {
            this.activeHighlightType = null;
        }
    }
    
    getParagraphDataFromEditor() {
        if (!this.instance) return [];
        const body = this.instance.getBody();
        if (!body) return [];
        
        const blockSelector = 'p, div, li, blockquote';
        let paragraphNodes = Array.from(body.querySelectorAll(blockSelector))
            .filter(node => {
                const text = (node.textContent || '').trim();
                if (text.length === 0) return false;
                
                const hasNestedParagraph = Array.from(node.children).some(child => {
                    const tag = child.tagName ? child.tagName.toLowerCase() : '';
                    return ['p', 'div', 'li', 'blockquote'].includes(tag);
                });
                
                if (node.tagName && node.tagName.toLowerCase() === 'p') {
                    return true;
                }
                
                return !hasNestedParagraph;
            });
        
        if (paragraphNodes.length === 0) {
            const fallbackText = this.instance.getContent({ format: 'text' }) || '';
            const segments = fallbackText.split(/\n{2,}/).map(segment => segment.trim()).filter(Boolean);
            return segments.map((text, index) => {
                const normalized = normalizeParagraphText(text);
                const wordCount = countWords(normalized);
                return {
                    index,
                    node: null,
                    text,
                    normalized,
                    wordCount,
                    fingerprint: createParagraphFingerprint(normalized, wordCount, index)
                };
            });
        }
        
        return paragraphNodes.map((node, index) => {
            const rawText = node.textContent || '';
            const normalized = normalizeParagraphText(rawText);
            const wordCount = countWords(normalized);
            return {
                index,
                node,
                text: rawText,
                normalized,
                wordCount,
                fingerprint: createParagraphFingerprint(normalized, wordCount, index)
            };
        });
    }
    
    findParagraphByAnalyzerInfo(paragraphs, analyzerInfo) {
        if (!analyzerInfo) return null;
        
        if (typeof analyzerInfo.index === 'number' && analyzerInfo.index >= 0 && analyzerInfo.index < paragraphs.length) {
            const candidate = paragraphs[analyzerInfo.index];
            if (candidate) return candidate;
        }
        
        const snippet = (analyzerInfo.normalizedText || '').slice(0, 60);
        if (snippet.length === 0) return null;
        
        return paragraphs.find(p => p.normalized.includes(snippet)) || null;
    }

    buildAnalyzerDataFromParagraphs(paragraphs = []) {
        return paragraphs
            .filter(p => p.wordCount > SEO_LIMITS.PARAGRAPH_LENGTH_STANDARD_MAX)
            .map(p => ({
                index: p.index,
                wordCount: p.wordCount,
                status: p.wordCount >= SEO_LIMITS.PARAGRAPH_LENGTH_UNSUITABLE_MIN ? 'unsuitable' : 'long',
                fingerprint: p.fingerprint,
                normalizedText: p.normalized
            }));
    }

    buildSummaryFromDesiredMap(desiredMap = new Map()) {
        return Array.from(desiredMap.entries()).map(([fingerprint, info]) => ({
            index: typeof info.index === 'number' ? info.index : -1,
            wordCount: info.wordCount || 0,
            status: info.status || 'long',
            fingerprint,
            normalizedText: info.normalized || info.normalizedText || ''
        }));
    }
    
    /**
     * پاک کردن هایلایت‌ها
     */
    clearHighlights(type = null, fingerprints = null) {
        if (!this.instance) return;
        
        if (type === 'paragraph-length') {
            this.cancelHighlightBatch();
            this.removeHighlightByFingerprints(fingerprints);
            return;
        }
        
        const editorBody = this.instance.getBody();
        if (!editorBody) return;
        
        let selector = '[data-highlight-type]';
        if (type) {
            selector = `[data-highlight-type="${type}"]`;
        }
        
        const highlightedElements = editorBody.querySelectorAll(selector);
            highlightedElements.forEach(el => {
            el.classList.remove('highlight-long-paragraph', 'long-paragraph');
                el.removeAttribute('data-highlight-type');
                el.removeAttribute('data-word-count');
                el.removeAttribute('data-highlight-status');
                el.removeAttribute('title');
            });
        
        if (!type || type === this.activeHighlightType) {
            this.activeHighlightType = null;
        }
    }
    
    /**
     * پاک کردن هایلایت‌ها هنگام تغییر محتوا (هوشمند)
     * ✅ بهبود یافته: فقط زمانی cleanup کند که واقعاً محتوا تغییر کرده باشد
     */
    setupSmartHighlightCleanup() {
        if (!this.instance) return;
        
        // ✅ ذخیره محتوای قبلی برای مقایسه (به صورت instance variable)
        this._lastContentForCleanup = '';
        
        // فقط پاک کردن با تاخیر و زمانی که تغییر واقعی از طرف کاربر باشد
        const debouncedCleanup = debounce(() => {
            // ✅ فقط پاک کن اگر:
            // 1. هایلایت فعال باشد
            // 2. در حال اعمال هایلایت نباشیم
            // 3. محتوا واقعاً تغییر کرده باشد (نه فقط class اضافه شده یا format)
            if (this.activeHighlightType && !this.isApplyingHighlight) {
                // ✅ استفاده از getContent با format: 'text' برای مقایسه فقط محتوای متنی
                // ✅ حذف whitespace و normalize برای مقایسه دقیق‌تر
                const currentContent = this.instance.getContent({ format: 'text' })
                    .replace(/\s+/g, ' ')
                    .trim();
                const lastContent = this._lastContentForCleanup 
                    ? this._lastContentForCleanup.replace(/\s+/g, ' ').trim()
                    : '';
                
                // ✅ اگر محتوا تغییر کرده باشد، هایلایت را پاک کن و دوباره اعمال کن
                if (lastContent && currentContent !== lastContent) {
                    // ✅ پاک کردن هایلایت فعلی
                    this.clearHighlights(this.activeHighlightType);
                    
                    // ✅ ذخیره محتوای جدید
                    this._lastContentForCleanup = currentContent;
                    
                    // ✅ اگر هایلایت فعال است، event برای دوباره اعمال کردن ارسال کن
                    if (this.activeHighlightType === 'paragraph-length') {
                        // Event برای دوباره اعمال کردن هایلایت
                        setTimeout(() => {
                            const reapplyEvent = new CustomEvent('reapplyHighlight', {
                                detail: { type: 'paragraph-length' }
                            });
                            document.dispatchEvent(reapplyEvent);
                        }, 150);
                    }
                } else if (!this._lastContentForCleanup) {
                    // ✅ اولین بار: فقط ذخیره کن
                    this._lastContentForCleanup = currentContent;
                }
                // ✅ اگر محتوا تغییر نکرده (مثلاً فقط rtl/ltr تغییر کرده)، هیچ کاری نکن (هایلایت باقی بماند)
            }
        }, 600); // ✅ بهینه: کاهش delay برای پاسخگویی بهتر
        
        // ✅ ذخیره محتوای اولیه
        setTimeout(() => {
            if (this.instance) {
                this._lastContentForCleanup = this.instance.getContent({ format: 'text' });
            }
        }, 500);
        
        // ✅ فقط event های مربوط به تغییر محتوا را listen کن (بهینه: فقط input)
        this.instance.on('input', () => {
            if (this.longParagraphState.pendingBatch) {
                this.cancelHighlightBatch();
            }
            // ✅ فقط اگر فلگ فعال نباشد، cleanup را اجرا کن
            if (!this.isApplyingHighlight) {
                debouncedCleanup();
            }
        });
        
        // ✅ Event برای تغییرات format (rtl/ltr) - فقط هایلایت را دوباره اعمال کن (بدون cleanup)
        this.instance.on('ExecCommand', (e) => {
            // ✅ اگر دستور mceDirectionLtr یا mceDirectionRtl اجرا شد
            if (e.command === 'mceDirectionLtr' || e.command === 'mceDirectionRtl') {
                // ✅ تنظیم فلگ برای جلوگیری از cleanup
                this.isApplyingHighlight = true;
                
                // ✅ اگر هایلایت فعال است، فقط دوباره اعمال کن (بدون cleanup)
                if (this.activeHighlightType === 'paragraph-length') {
                    setTimeout(() => {
                        const reapplyEvent = new CustomEvent('reapplyHighlight', {
                            detail: { type: 'paragraph-length' }
                        });
                        document.dispatchEvent(reapplyEvent);
                        
                        // ✅ به‌روزرسانی محتوای ذخیره‌شده
                        if (this._lastContentForCleanup !== undefined) {
                            this._lastContentForCleanup = this.instance.getContent({ format: 'text' })
                                .replace(/\s+/g, ' ')
                                .trim();
                        }
                        
                        // ✅ ریست فلگ
                        setTimeout(() => {
                            this.isApplyingHighlight = false;
                        }, 200);
                    }, 100);
                } else {
                    // ✅ اگر هایلایت فعال نیست، فقط فلگ را ریست کن
                    setTimeout(() => {
                        this.isApplyingHighlight = false;
                    }, 100);
                }
            }
        });
        
        // ✅ برای undo/redo و SetContent هم بررسی کن
        this.instance.on('undo redo SetContent', () => {
            if (!this.isApplyingHighlight) {
                // برای undo/redo، بلافاصله بررسی کن (بدون debounce)
                setTimeout(() => {
                    if (this.activeHighlightType && !this.isApplyingHighlight) {
                        const currentContent = this.instance.getContent({ format: 'text' });
                        if (this._lastContentForCleanup && currentContent !== this._lastContentForCleanup) {
                            this.clearHighlights(this.activeHighlightType);
                            this._lastContentForCleanup = currentContent;
                            
                            // ✅ اگر هایلایت فعال است، event برای دوباره اعمال کردن ارسال کن
                            if (this.activeHighlightType === 'paragraph-length') {
                                const reapplyEvent = new CustomEvent('reapplyHighlight', {
                                    detail: { type: 'paragraph-length' }
                                });
                                document.dispatchEvent(reapplyEvent);
                            }
                        }
                    }
                }, 100);
            }
        });
        
        // ✅ برای تغییرات format (rtl/ltr) - فقط اگر محتوای واقعی تغییر کرده باشد
        // ✅ حذف NodeChange listener چون ExecCommand را اضافه کردیم
    }
}

export default TinyMCEManager;
