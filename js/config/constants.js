/**
 * تنظیمات و ثابت‌های برنامه
 * ES Module Version
 * ✅ اضافه شده: Debug Mode Configuration
 * ✅ اضافه شده: Semantic Analysis Configuration
 */

export const CONFIG = {
    // ✅ تنظیمات Debug Mode
    DEBUG: {
        ENABLED: true, // ✅ تغییر به true برای فعال کردن لاگ‌ها
        LEVELS: {
            info: true,     // لاگ‌های اطلاعاتی (آبی)
            success: true,  // لاگ‌های موفقیت (سبز)
            warn: true,     // لاگ‌های هشدار (نارنجی)
            error: true,    // لاگ‌های خطا (قرمز) - همیشه فعال
            debug: true     // لاگ‌های دیباگ (بنفش)
        }
    },
    
    // ✅ تنظیمات Semantic Analysis (جدید)
    SEMANTIC_ANALYSIS: {
        // وزن‌های امتیازدهی نهایی
        WEIGHTS: {
            FREQUENCY: 0.20,        // 20% - تکرار در متن
            CO_OCCURRENCE: 0.25,    // 25% - همزمانی با main keyword
            CONTEXT: 0.20,          // 20% - موقعیت در ساختار
            PROXIMITY: 0.15,        // 15% - نزدیکی فیزیکی
            QUALITY: 0.20           // 20% - کیفیت ساختاری
        },
        
        // تنظیمات Co-occurrence
        CO_OCCURRENCE: {
            MIN_RATIO: 0.3,         // حداقل نسبت برای امتیاز
            MAX_SCORE: 25           // حداکثر امتیاز
        },
        
        // تنظیمات Context
        CONTEXT: {
            H1_SCORE: 15,           // امتیاز H1
            H2H3_SCORE: 10,         // امتیاز H2-H3
            FIRST_PARAGRAPH: 8,     // امتیاز پاراگراف اول
            MAX_SCORE: 20           // حداکثر امتیاز
        },
        
        // تنظیمات Proximity
        PROXIMITY: {
            SAME_SENTENCE: 15,      // امتیاز همان جمله
            NEAR_SENTENCE: 5,       // امتیاز جملات نزدیک
            WINDOW_SIZE: 3,         // تعداد جملات قبل/بعد
            MAX_SCORE: 15           // حداکثر امتیاز
        },
        
        // تنظیمات Quality
        QUALITY: {
            WORD_COUNT_SCORES: {
                4: 8,               // 4 کلمه
                3: 6,               // 3 کلمه
                2: 4,               // 2 کلمه
                1: 1                // 1 کلمه
            },
            MAX_FREQUENCY_SCORE: 10,
            OPTIMAL_LENGTH_MIN: 10,
            OPTIMAL_LENGTH_MAX: 50
        },
        
        // تنظیمات Stopwords
        STOPWORDS: {
            REJECT_RATIO: 0.6,      // حذف کامل اگر > 60%
            HEAVY_PENALTY: 0.5,     // جریمه -5 اگر > 50%
            MEDIUM_PENALTY: 0.3,    // جریمه -3 اگر > 30%
            LIGHT_PENALTY: 0.1      // جریمه -1 اگر > 10%
        },
        
        // تنظیمات Clustering
        CLUSTERING: {
            SIMILARITY_THRESHOLD: 0.7,  // بیش از 70% مشابه
            ENABLE_DIVERSITY: true       // فعال‌سازی clustering
        },
        
        // Threshold های Adaptive
        THRESHOLDS: {
            MAIN_KEYWORD: {
                WORDS_200: 15,      // کمتر از 200 کلمه
                WORDS_400: 20,      // 200-400 کلمه
                WORDS_700: 25,      // 400-700 کلمه
                WORDS_1000: 30,     // 700-1000 کلمه
                WORDS_MORE: 35      // بیشتر از 1000 کلمه
            },
            SECONDARY_KEYWORD: {
                WORDS_200: 10,
                WORDS_400: 15,
                WORDS_700: 20,
                WORDS_1000: 25,
                WORDS_MORE: 30
            }
        }
    },
    
    // محدودیت‌های SEO
    SEO_LIMITS: {
        MIN_KEYWORD_DENSITY: 0.5,
        MAX_KEYWORD_DENSITY: 2.5,
        MAX_SENTENCE_WORDS: 20,
        MAX_PARAGRAPH_WORDS: 150,
        WORDS_PER_IMAGE: 350,
        MAX_ACCEPTABLE_WORDS_PER_IMAGE: 400,
        MIN_SECONDARY_KEYWORD_PERCENTAGE: 70,
        
        // طول H1
        MIN_H1_LENGTH: 20,
        MAX_H1_LENGTH: 60,
        
        // محدودیت‌های طول پاراگراف (خوانایی)
        PARAGRAPH_LENGTH_STANDARD_MAX: 150,
        PARAGRAPH_LENGTH_ACCEPTABLE_MAX: 175,
        PARAGRAPH_LENGTH_UNSUITABLE_MIN: 200,
        MAX_LONG_PARAGRAPHS_PERCENTAGE: 25
    },

    // امتیازبندی SEO
    SCORE_THRESHOLDS: {
        EXCELLENT: 80,
        GOOD: 60
    },

    // تنظیمات تحلیل
    ANALYSIS: {
        DEBOUNCE_DELAY: 500,
        PARALLEL_EXECUTION: true,
        TIMEOUT: 30000
    },

    // پیام‌های وضعیت
    MESSAGES: {
        NO_KEYWORD: { label: 'در انتظار...', desc: 'لطفاً کلمه کلیدی اصلی را وارد کنید' },
        ANALYZING: { label: 'در حال تحلیل...', desc: 'لطفاً صبر کنید' },
        EXCELLENT: { label: 'عالی!', desc: 'محتوای شما بهینه است' },
        GOOD: { label: 'خوب', desc: 'نیاز به بهبود دارد' },
        POOR: { label: 'ضعیف', desc: 'محتوا نیاز به بهینه‌سازی دارد' }
    },

    // وضعیت‌های چک
    CHECK_STATUS: {
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'error'
    },

    // نمادهای وضعیت
    STATUS_ICONS: {
        success: '✓',
        warning: '!',
        error: '✕'
    },

    // رنگ‌های وضعیت
    STATUS_COLORS: {
        success: { border: '#10b981', background: 'rgba(16, 185, 129, 0.2)' },
        warning: { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.2)' },
        error: { border: '#ef4444', background: 'rgba(239, 68, 68, 0.2)' }
    },

    // تنظیمات TinyMCE
    TINYMCE: {
        HEIGHT: 700,
        LANGUAGE: 'fa',
        DIRECTION: 'rtl',
        PLUGINS: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount emoticons codesample directionality',
        TOOLBAR: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat',
        MENUBAR: 'file edit view insert format tools table help',
        RESIZE: true,
        ELEMENT_PATH: false,
        STATUS_BAR: true,
        BRANDING: false,
        CONTENT_CSS: false,
        PASTE_BLOCK_DROP: false,
        PASTE_DATA_IMAGES: true,
        PASTE_MERGE_FORMATS: true,
        PASTE_AUTO_CLEANUP_ON_PASTE: true,
        PASTE_REMOVE_STYLES_IF_WEBKIT: false,
        PASTE_WEBKIT_STYLES: 'all'
    },

    // تنظیمات Analyzer ها
    ANALYZERS: {
        // SEO Analyzers
        seo: {
            h1: {
                enabled: true,
                priority: 1
            },
            h1Length: {
                enabled: true,
                priority: 2,
                minLength: 20,
                maxLength: 60
            },
            keywordDensity: {
                enabled: true,
                priority: 3,
                minDensity: 0.5,
                maxDensity: 2.5,
                minHeadingDensity: 3,
                maxHeadingDensity: 10
            },
            firstParagraph: {
                enabled: true,
                priority: 2,
                maxPreviewLength: 80
            },
            secondaryKeywords: {
                enabled: true,
                priority: 5,
                minPercentage: 70
            },
            image: {
                enabled: true,
                priority: 6,
                wordsPerImage: 350,
                maxWordsPerImage: 400
            },
            blueKeyword: {
                enabled: true,
                priority: 7
            },
            link: {
                enabled: true,
                priority: 8,
                minPercentage: 50
            }
        },
        
        // Readability Analyzers
        readability: {
            paragraphLength: {
                enabled: true,
                priority: 11
            }
        }
    },

    // تنظیمات هایلایت
    HIGHLIGHT: {
        ENABLED: true,
        AUTO_CLEAR_ON_CHANGE: true,
        COLORS: {
            long: {
                background: 'rgba(239, 68, 68, 0.08)',
                border: '#ef4444'
            },
            unsuitable: {
                background: 'rgba(220, 38, 38, 0.12)',
                border: '#dc2626'
            }
        },
        TOOLTIP_DELAY: 500
    }
};

// Export اجزای مهم به صورت جداگانه
export const DEBUG_CONFIG = CONFIG.DEBUG;
export const SEMANTIC_ANALYSIS_CONFIG = CONFIG.SEMANTIC_ANALYSIS;
export const SEO_LIMITS = CONFIG.SEO_LIMITS;
export const SCORE_THRESHOLDS = CONFIG.SCORE_THRESHOLDS;
export const CHECK_STATUS = CONFIG.CHECK_STATUS;
export const STATUS_ICONS = CONFIG.STATUS_ICONS;
export const STATUS_COLORS = CONFIG.STATUS_COLORS;
export const MESSAGES = CONFIG.MESSAGES;
export const TINYMCE_CONFIG = CONFIG.TINYMCE;
export const ANALYZERS_CONFIG = CONFIG.ANALYZERS;
export const HIGHLIGHT_CONFIG = CONFIG.HIGHLIGHT;

// Default export
export default CONFIG;
