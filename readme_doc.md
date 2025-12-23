# 📝 ادیتور TinyMCE با تحلیل SEO - نسخه ES Module

---

## 🆕 تغییرات نسخه 2.2.0

✅ **Debug Mode System**: سیستم لاگ حرفه‌ای با قابلیت فعال/غیرفعال  
✅ **Bug Fixes**: رفع مشکل duplicate click در keyword suggestions  
✅ **Performance**: بهینه‌سازی event listeners و rendering  
✅ **Logger**: جایگزینی console.log با سیستم logger رنگی

---

## 🏗️ ساختار پروژه

```
project/
├── index.html              # فایل HTML اصلی
├── css/
│   ├── main.css           # استایل‌های عمومی و Layout
│   ├── editor.css         # استایل‌های ادیتور
│   ├── seo-panel.css      # استایل‌های پنل SEO
│   └── modal.css          # استایل‌های مودال
├── tinymce/               # ⚠️ فایل‌های TinyMCE (دست نزن)
│   └── ...
├── js/
│   ├── main.js            # 🎯 نقطه ورود - Orchestrator
│   │
│   ├── config/
│   │   └── constants.js   # تنظیمات و ثابت‌ها (شامل DEBUG)
│   │
│   ├── core/
│   │   ├── analysis-data.js      # 📊 مدل داده تحلیل
│   │   └── analysis-engine.js    # 🧠 موتور تحلیل مرکزی
│   │
│   ├── analyzers/         # 🔍 ماژول‌های تحلیل SEO
│   │   ├── base-analyzer.js      # کلاس پایه
│   │   ├── h1-analyzer.js
│   │   ├── h1-length-analyzer.js
│   │   ├── keyword-density-analyzer.js
│   │   ├── first-paragraph-analyzer.js
│   │   ├── secondary-keywords-analyzer.js
│   │   ├── image-analyzer.js
│   │   ├── blue-keyword-analyzer.js
│   │   ├── link-analyzer.js
│   │   ├── paragraph-length-analyzer.js
│   │   └── index.js       # Export مرکزی
│   │
│   ├── utils/
│   │   ├── text-utils.js  # پردازش متن (normalize, count, split)
│   │   ├── dom-utils.js   # کار با DOM (extract, parse)
│   │   ├── keyword-utils.js # کار با کلمات کلیدی
│   │   ├── paragraph-utils.js # ابزارهای پاراگراف
│   │   ├── helpers.js     # توابع کمکی (debounce, escape)
│   │   └── logger.js      # 🆕 سیستم Debug/Logger
│   │
│   ├── ui/
│   │   ├── ui-controller.js      # 🎨 کنترلر اصلی UI
│   │   ├── score-display.js      # نمایش امتیاز
│   │   ├── checks-renderer.js    # رندر چک‌ها
│   │   ├── tabs-manager.js       # مدیریت تب‌ها
│   │   ├── keywords-input.js     # ورودی کلمات کلیدی
│   │   ├── modal-manager.js      # مدیریت مودال
│   │   └── index.js              # Export مرکزی
│   │
│   └── editor/
│       └── tinymce-manager.js    # مدیریت TinyMCE
└── README.md              # این فایل
```

---

## 🎯 ویژگی‌های اصلی

### 1. تحلیل SEO (8 Analyzer)

✅ بررسی کلمه کلیدی در H1  
✅ بررسی طول عنوان (H1)  
✅ بررسی تراکم کلمه کلیدی (متن + هدینگ)  
✅ بررسی کلمه کلیدی در پاراگراف اول  
✅ بررسی کلمات کلیدی فرعی  
✅ بررسی Alt تصاویر و نسبت تصویر به متن  
✅ بررسی رنگ آبی برای کلمه کلیدی (توصیه)  
✅ بررسی لینک‌دهی با کلمات کلیدی  

### 2. تحلیل خوانایی (1 Analyzer)

✅ تشخیص پاراگراف‌های بلند با هایلایت تعاملی

### 3. پیشنهاد کلمات کلیدی

✅ تشخیص خودکار کلمات کلیدی اصلی  
✅ تشخیص خودکار کلمات کلیدی فرعی  
✅ محاسبه کیفیت (Quality) و ارتباط (Relevance)  

### 4. رابط کاربری

✅ نمایش امتیاز کلی SEO (0-100)  
✅ Progress Bar خطی  
✅ نمایش آمار کلمات و کلیدواژه‌ها  
✅ توضیحات تعاملی برای هر چک  
✅ طراحی Responsive  
✅ هایلایت پاراگراف‌های طولانی در ادیتور  

### 5. 🆕 Debug Mode

✅ سیستم لاگ  
✅ دسته‌بندی log ها (info, success, warn, error, debug)  
✅ قابلیت فعال/غیرفعال کردن از طریق config  
✅ فیلتر کردن سطوح log  

---

## 🧠 معماری Analysis Engine

### جریان کار (Workflow)

```
┌──────────────────────────────────────────────────────────┐
│                        main.js                           │
│                  (Entry Point)                           │
└────────────────┬─────────────────────┬───────────────────┘
                 │                     │
                 ▼                     ▼
    ┌────────────────────┐   ┌─────────────────────┐
    │  Analysis Engine   │   │   UI Controller     │
    │   (Core Logic)     │   │   (Presentation)    │
    └────────┬───────────┘   └──────────▲──────────┘
             │                          │
             │ AnalysisData             │ Display Results
             ▼                          │
    ┌─────────────────────────────────────────┐
    │         Analyzer Registry               │
    │  ┌──────────┐  ┌──────────┐           │
    │  │ H1       │  │ Keyword  │  ...      │
    │  │ Analyzer │  │ Density  │           │
    │  └──────────┘  └──────────┘           │
    └─────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │   Utils & Helpers   │
    │  (Text, DOM, etc.)  │
    └─────────────────────┘
```

### مراحل اجرا

1. **User Input** → تغییر محتوا یا کلمات کلیدی
2. **main.js** → scheduleAnalysis() با debounce
3. **Analysis Engine** → تصمیم‌گیری:
   - اگر کلمه کلیدی دارد → اجرای SEO + Readability Analyzers
   - اگر کلمه کلیدی ندارد → اجرای Suggestion Analyzers
4. **AnalysisData** → جمع‌آوری نتایج
5. **UI Controller** → نمایش نتایج

---

## 🔧 نحوه افزودن Analyzer جدید

### مرحله 1: ساخت کلاس Analyzer

```javascript
// js/analyzers/my-new-analyzer.js
import { SEOAnalyzer } from './base-analyzer.js';

export class MyNewAnalyzer extends SEOAnalyzer {
    constructor(config = {}) {
        super('MyNewAnalyzer', {
            requiresKeyword: true,
            priority: 9, // اولویت (1-20)
            ...config
        });
    }
    
    async analyze(analysisData) {
        const { content, mainKeyword } = analysisData;
        
        // منطق تحلیل...
        const isValid = this.checkSomething(content, mainKeyword);
        
        if (isValid) {
            return this.createSuccessCheck(
                'عنوان چک',
                'توضیح موفقیت',
                { tooltip: 'راهنما' }
            );
        } else {
            return this.createErrorCheck(
                'عنوان چک',
                'توضیح خطا',
                { tooltip: 'راهنما' }
            );
        }
    }
    
    checkSomething(content, keyword) {
        // منطق بررسی
        return true;
    }
}

export default MyNewAnalyzer;
```

### مرحله 2: اضافه کردن به index.js

```javascript
// js/analyzers/index.js
export { MyNewAnalyzer } from './my-new-analyzer.js';

export function createSEOAnalyzers(config = {}) {
    return [
        // ... سایر Analyzer ها
        new MyNewAnalyzer(config.myNew || {})
    ];
}
```

### مرحله 3: اضافه کردن به Config (اختیاری)

```javascript
// js/config/constants.js
ANALYZERS: {
    seo: {
        // ...
        myNew: {
            enabled: true,
            priority: 9,
            customOption: 'value'
        }
    }
}
```

**تمام! ✅** Analyzer شما اضافه شد بدون تغییر در کد اصلی.

---

## 🆕 Debug Mode - راهنمای کامل

### فعال/غیرفعال کردن Debug Mode

#### روش 1: از طریق Config File (دائمی)

```javascript
// js/config/constants.js
DEBUG: {
    ENABLED: true, // ✅ true = فعال | false = غیرفعال
    LEVELS: {
        info: true,     // لاگ‌های اطلاعاتی (آبی)
        success: true,  // لاگ‌های موفقیت (سبز)
        warn: true,     // لاگ‌های هشدار (نارنجی)
        error: true,    // لاگ‌های خطا (قرمز)
        debug: false    // لاگ‌های دیباگ (بنفش)
    }
}
```

#### روش 2: از طریق Console (موقت)

```javascript
// در Console مرورگر:

// فعال کردن
window.logger.setEnabled(true);

// غیرفعال کردن
window.logger.setEnabled(false);

// غیرفعال کردن فقط debug logs
window.logger.setLevel('debug', false);

// نمایش وضعیت
window.logger.showStatus();
```

### استفاده از Logger در کد

```javascript
import { logger } from './utils/logger.js';

// اطلاعاتی (آبی) ℹ️
logger.info('پیام اطلاعاتی');

// موفقیت (سبز) ✅
logger.success('عملیات موفق');

// هشدار (نارنجی) ⚠️
logger.warn('هشدار');

// خطا (قرمز) ❌ - همیشه نمایش داده می‌شود
logger.error('خطا');

// دیباگ (بنفش) 🔍
logger.debug('دیباگ');

// گروه‌بندی
logger.group('عنوان گروه', () => {
    logger.info('داخل گروه');
});

// جدول
logger.table({ name: 'علی', age: 25 });

// زمان‌سنجی
logger.time('عملیات');
// ... کد
logger.timeEnd('عملیات');
```

### توصیه برای Production

```javascript
// برای محیط توسعه (development)
DEBUG: { ENABLED: true }

// برای محیط تولید (production)
DEBUG: { ENABLED: false }
```

---

## 📦 کلاس‌های پایه

### 1. BaseAnalyzer

برای همه Analyzer ها:

```javascript
class BaseAnalyzer {
    analyze(analysisData)          // متد اصلی تحلیل
    shouldRun(analysisData)        // بررسی شرایط اجرا
    createSuccessCheck(...)        // ساخت چک موفق
    createWarningCheck(...)        // ساخت چک هشدار
    createErrorCheck(...)          // ساخت چک خطا
}
```

### 2. SEOAnalyzer (extends BaseAnalyzer)

برای تحلیل‌های SEO:

```javascript
class SEOAnalyzer extends BaseAnalyzer {
    // requiresKeyword: بررسی نیاز به کلمه کلیدی
    // hasScore: true (در نمره تاثیر دارد)
}
```

### 3. ReadabilityAnalyzer (extends BaseAnalyzer)

برای تحلیل‌های خوانایی:

```javascript
class ReadabilityAnalyzer extends BaseAnalyzer {
    // hasScore: false (در نمره تاثیر ندارد)
}
```

### 4. SuggestionAnalyzer (extends BaseAnalyzer)

برای پیشنهادات:

```javascript
class SuggestionAnalyzer extends BaseAnalyzer {
    // فقط زمانی اجرا می‌شود که کلمه کلیدی نباشد
}
```

---

## 🛠️ API و توابع کمکی

### Text Utils

```javascript
import { normalizeText, countWords, splitIntoSentences } from './utils/text-utils.js';

normalizeText(text)           // نرمال‌سازی متن
countWords(text)              // شمارش کلمات
splitIntoSentences(text)      // تقسیم به جملات
extractWords(text)            // استخراج کلمات
```

### DOM Utils

```javascript
import { extractText, parseHTML, hasKeywordInSection } from './utils/dom-utils.js';

extractText(html)                    // استخراج متن از HTML
parseHTML(html)                      // پارس کامل HTML
hasKeywordInSection(html, kw, sel)   // جستجوی کلیدواژه در بخش
extractImages(html)                  // استخراج تصاویر
extractLinks(html)                   // استخراج لینک‌ها
```

### Keyword Utils

```javascript
import { findKeyword, suggestKeywords, calculateKeywordQuality } from './utils/keyword-utils.js';

findKeyword(text, keyword)              // جستجوی کلمه کلیدی
countKeyword(text, keyword)             // شمارش تکرار
calculateKeywordDensity(text, keyword)  // محاسبه تراکم
suggestKeywords(text, max)              // پیشنهاد کلمات
detectMainKeyword(text, max)            // تشخیص کلمه اصلی
detectSecondaryKeywords(text, max)      // تشخیص کلمات فرعی
```

### Helpers

```javascript
import { debounce, escapeHtml, formatDecimal } from './utils/helpers.js';

debounce(func, delay)        // تاخیر در اجرا
throttle(func, limit)        // محدودسازی اجرا
escapeHtml(text)             // محافظت XSS
deepClone(obj)               // کلون عمیق
delay(ms)                    // انتظار (Promise)
retry(fn, attempts)          // تلاش مجدد
```

### 🆕 Logger

```javascript
import { logger } from './utils/logger.js';

logger.info('...')        // لاگ اطلاعاتی
logger.success('...')     // لاگ موفقیت
logger.warn('...')        // لاگ هشدار
logger.error('...')       // لاگ خطا
logger.debug('...')       // لاگ دیباگ
logger.setEnabled(bool)   // فعال/غیرفعال
logger.showStatus()       // نمایش وضعیت
```

---

## 🎨 سفارشی‌سازی

### تغییر محدودیت‌های SEO

```javascript
// js/config/constants.js
SEO_LIMITS: {
    MIN_KEYWORD_DENSITY: 0.5,   // حداقل تراکم
    MAX_KEYWORD_DENSITY: 2.5,   // حداکثر تراکم
    MAX_PARAGRAPH_WORDS: 150,   // حداکثر کلمات پاراگراف
}
```

### غیرفعال کردن یک Analyzer

```javascript
// js/config/constants.js
ANALYZERS: {
    seo: {
        blueKeyword: {
            enabled: false  // ✅ غیرفعال
        }
    }
}
```

### تغییر اولویت اجرا

```javascript
// اولویت کمتر = اجرای زودتر
ANALYZERS: {
    seo: {
        h1: {
            priority: 1  // اول اجرا می‌شود
        },
        image: {
            priority: 10  // آخر اجرا می‌شود
        }
    }
}
```

---

## 🐛 دیباگ و مشکل‌یابی

### فعال کردن لاگ‌ها

در `js/config/constants.js`:

```javascript
DEBUG: {
    ENABLED: true  // ✅ فعال کردن لاگ‌ها
}
```

یا در Console:

```javascript
window.logger.setEnabled(true);
```

### بررسی وضعیت Engine

```javascript
// در Console مرورگر:
window.MainApp.engine.getInfo()

// نتیجه:
{
    isRunning: false,
    analyzers: {
        seo: [...],
        readability: [...]
    },
    config: {...}
}
```

### دسترسی به آخرین AnalysisData

```javascript
window.MainApp.engine.currentAnalysis
```

---

## ⚡ بهینه‌سازی عملکرد

### 1. Debouncing

تحلیل با تاخیر 500ms انجام می‌شود:

```javascript
ANALYSIS: {
    DEBOUNCE_DELAY: 500
}
```

### 2. Parallel Execution

Analyzer ها به صورت موازی اجرا می‌شوند:

```javascript
ANALYSIS: {
    PARALLEL_EXECUTION: true
}
```

### 3. Caching

المان‌های DOM یکبار کش می‌شوند.

### 4. Efficient Updates

تغییرات UI به صورت بهینه اعمال می‌شوند.

### 5. 🆕 Clone Container

Event listeners قدیمی با clone کردن container حذف می‌شوند.

---

## 🔒 امنیت

### 1. XSS Protection

تمام ورودی‌ها escape می‌شوند:

```javascript
import { escapeHtml } from './utils/helpers.js';
const safe = escapeHtml(userInput);
```

### 2. Input Sanitization

HTML paste شده تمیز می‌شود:

```javascript
processPastedHTML(html) // در TinyMCEManager
```

---

## 📊 معیارهای تحلیل

### امتیازدهی SEO

- **80-100**: عالی ✅
- **60-79**: خوب ⚠️
- **0-59**: ضعیف ❌

### استانداردهای Yoast

- **پاراگراف‌ها**: حداکثر 25% بلندتر از 150 کلمه

---

## 📋 لیست کامل Analyzer ها

### SEO Analyzers (8 مورد)

| Analyzer | اولویت | نیاز به کلمه کلیدی | توضیح |
|----------|--------|---------------------|-------|
| H1Analyzer | 1 | ✅ | بررسی وجود کلمه کلیدی در H1 |
| H1LengthAnalyzer | 2 | ❌ | بررسی طول عنوان (20-60 کاراکتر) |
| FirstParagraphAnalyzer | 2 | ✅ | بررسی کلمه کلیدی در پاراگراف اول |
| KeywordDensityAnalyzer | 3 | ✅ | بررسی تراکم در متن و هدینگ (2 چک) |
| SecondaryKeywordsAnalyzer | 5 | ❌ | بررسی وجود کلمات فرعی |
| ImageAnalyzer | 6 | ✅ | Alt تصاویر + نسبت تصویر به متن |
| BlueKeywordAnalyzer | 7 | ✅ | رنگ آبی برای کلمه کلیدی (توصیه) |
| LinkAnalyzer | 8 | ✅ | لینک‌دهی با کلمات کلیدی |

### Readability Analyzers (1 مورد)

| Analyzer | اولویت | توضیح |
|----------|--------|-------|
| ParagraphLengthAnalyzer | 11 | پاراگراف‌های بلند (>150 کلمه) |

---

## 🎓 منابع آموزشی

### ES Modules
- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### TinyMCE
- [TinyMCE Documentation](https://www.tiny.cloud/docs/)

### SEO Best Practices
- [Yoast SEO Guidelines](https://yoast.com/complete-guide-seo/)
- [Google Search Central](https://developers.google.com/search)

---

## 🚀 شروع سریع

```bash
# 1. آپلود فایل‌ها به هاست
# 2. مطمئن شوید TinyMCE در مسیر /tinymce/ قرار دارد
# 3. باز کردن index.html در مرورگر
# 4. شروع تایپ و تحلیل خودکار!
```

### تنظیم Debug Mode

```javascript
// در js/config/constants.js

// برای توسعه:
DEBUG: { ENABLED: true }

// برای تولید:
DEBUG: { ENABLED: false }
```

---

## 📝 نسخه‌ها

### نسخه فعلی: 2.2.0 (ES Module - Debug Mode)

**تاریخ**: دسامبر 2025  
**وضعیت**: ✅ آماده برای استفاده

### تغییرات نسخه 2.2.0

✅ **اضافه شده**: سیستم Debug Mode حرفه‌ای با logger  
✅ **رفع شده**: مشکل duplicate click در keyword suggestions  
✅ **بهبود**: Performance بهبود یافته با clone container  
✅ **بهبود**: Event listeners بهینه‌سازی شده  

### تغییرات نسخه 2.1.0

❌ حذف ابزار بررسی طول جملات (موقت - طراحی مجدد در آینده)  
✅ بهبود عملکرد تحلیل خوانایی  
✅ بهینه‌سازی ساختار Analyzer ها  
✅ افزایش سرعت و پایداری  

### تغییرات نسخه 2.0.0

✅ معماری ES Module  
✅ Analysis Engine  
✅ Separation of Concerns  
✅ Scalable Architecture  
✅ Clean Code  

---

## 📞 پشتیبانی

برای گزارش باگ یا درخواست ویژگی جدید، لطفاً از بخش Issues استفاده کنید.

---

## 📜 لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

---

## 🙏 تشکر

از تمام کسانی که در توسعه این پروژه مشارکت داشته‌اند، تشکر می‌کنیم!

---

**ساخته شده با ❤️ برای بهبود SEO محتوای فارسی**
