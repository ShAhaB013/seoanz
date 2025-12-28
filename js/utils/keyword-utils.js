/**
 * ماژول کار با کلمات کلیدی - Semantic Analysis
 * شامل: جستجو، تحلیل فرکانس، پیشنهاد کلمات با الگوریتم چندلایه
 * ✅ نسخه 2.0: Semantic Keyword Suggestion با Co-occurrence Analysis
 */

import { normalizeText, extractWords, countWords, isMeaningfulWord } from './text-utils.js';
import { extractTextFromHeadings, getFirstParagraph, extractParagraphs, hasKeywordInSection, parseHTML } from './dom-utils.js';
import { stopwordsManager } from './stopwords-loader.js';
import { logger } from './logger.js';

/**
 * جستجوی کلمه کلیدی در متن
 * @returns {Array} آرایه موقعیت‌ها
 */
export function findKeyword(text, keyword) {
    if (!keyword) return [];
    const normalizedText = normalizeText(text);
    const normalizedKeyword = normalizeText(keyword);
    const positions = [];
    let index = 0;

    while ((index = normalizedText.indexOf(normalizedKeyword, index)) !== -1) {
        positions.push(index);
        index += normalizedKeyword.length;
    }
    return positions;
}

/**
 * شمارش تعداد تکرار کلمه کلیدی
 */
export function countKeyword(text, keyword) {
    return findKeyword(text, keyword).length;
}

/**
 * محاسبه تراکم کلمه کلیدی
 */
export function calculateKeywordDensity(text, keyword) {
    const totalWords = countWords(text);
    if (totalWords === 0) return 0;
    
    const keywordCount = countKeyword(text, keyword);
    return (keywordCount / totalWords) * 100;
}

/**
 * تولید n-grams از آرایه کلمات
 */
export function generateNGrams(words, n = 2) {
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * شمارش فرکانس کلمات (با n-grams)
 */
export function countWordFrequencies(text) {
    const words = extractWords(text);
    const wordCounts = new Map();
    
    // bigrams (2 کلمه)
    const bigrams = generateNGrams(words, 2);
    bigrams.forEach(bigram => {
        wordCounts.set(bigram, (wordCounts.get(bigram) || 0) + 1);
    });
    
    // trigrams (3 کلمه)
    const trigrams = generateNGrams(words, 3);
    trigrams.forEach(trigram => {
        wordCounts.set(trigram, (wordCounts.get(trigram) || 0) + 1);
    });
    
    // 4-grams (4 کلمه)
    const fourgrams = generateNGrams(words, 4);
    fourgrams.forEach(fourgram => {
        wordCounts.set(fourgram, (wordCounts.get(fourgram) || 0) + 1);
    });
    
    return wordCounts;
}

/**
 * ✅ فیلتر کلمات مرتبط (نسخه Fix v2 - Frequency threshold تنظیم شد)
 */
export function filterRelevantWords(wordCounts) {
    const filtered = {};
    
    for (const [word, count] of wordCounts) {
        // ✅ بررسی اولیه - frequency threshold را حذف کردیم
        if (!isMeaningfulWord(word) || word.length <= 2) {
            continue;
        }
        
        // بررسی relevance
        if (!isRelevantPhrase(word)) {
            continue;
        }
        
        // ✅ تقسیم به کلمات
        const words = word.split(/\s+/);
        
        // ✅ محاسبه نسبت stopwords
        const stopwordRatio = stopwordsManager.calculateStopwordRatio(word);
        
        // ✅ 1. حذف اگر بیش از 50% stopword
        if (stopwordRatio >= 0.5) {
            continue;
        }
        
        // ✅ 2. حذف اگر شروع یا پایان با stopword
        const firstWord = words[0].toLowerCase();
        const lastWord = words[words.length - 1].toLowerCase();
        
        if (stopwordsManager.isStopword(firstWord) || 
            stopwordsManager.isStopword(lastWord)) {
            continue;
        }
        
        // ✅ 2.5. حذف اگر شامل stopword در وسط (برای تمام طول‌ها)
        if (words.length >= 2) {
            const middleWords = words.slice(1, -1); // کلمات وسط
            const hasStopwordInMiddle = middleWords.some(w => 
                stopwordsManager.isStopword(w.toLowerCase())
            );
            
            // برای عبارات 2 کلمه: بدون middle word
            // برای عبارات 3+ کلمه: هیچ stopword در وسط نباید باشد
            if (middleWords.length > 0 && hasStopwordInMiddle) {
                continue;
            }
        }
        
        // ✅ 2.6. حذف ترکیبات بی‌معنی (کلمات نامرتبط)
        if (words.length >= 2) {
            const meaninglessPatterns = [
                /^(کوچک|بزرگ|خوب|بد)\s+(طراحی|بهینه‌سازی|ساخت|ایجاد)/i,
                /^(جستجو|بررسی)\s+(سایت|محتوا)/i,
                /^(بسازید|بسازد)\s+\S+$/i,  // فعل امر + اسم
            ];
            
            let isMeaningless = false;
            for (const pattern of meaninglessPatterns) {
                if (pattern.test(word)) {
                    isMeaningless = true;
                    break;
                }
            }
            
            if (isMeaningless) {
                continue;
            }
        }
        
        // ✅ 3. برای عبارات 3+ کلمه، حداقل 2 کلمه معنادار لازم است
        if (words.length >= 3) {
            const meaningfulWords = words.filter(w => 
                !stopwordsManager.isStopword(w) && w.length > 2
            );
            
            if (meaningfulWords.length < 2) {
                continue;
            }
        }
        
        // ✅ 4. برای عبارات 2 کلمه، حداقل 1 کلمه معنادار لازم است
        if (words.length === 2) {
            const meaningfulWords = words.filter(w => 
                !stopwordsManager.isStopword(w) && w.length > 2
            );
            
            if (meaningfulWords.length < 1) {
                continue;
            }
        }
        
        // ✅ 5. حذف patterns خاص
        const invalidPatterns = [
            /^(برای|با|از|در|به|تا)\s+/i,           // شروع با حرف اضافه
            /\s+(را|رو|است|بود|شد|می|نمی)$/i,       // پایان با کلمات کمکی
            /^(این|آن|یک|دو)\s+/i,                   // شروع با اشاره/عدد
            /\s+(که|چون|اگر|ولی|اما)$/i,             // پایان با ربط
            /^(خیلی|بسیار|فقط)\s+/i,                 // شروع با قید
        ];
        
        let hasInvalidPattern = false;
        for (const pattern of invalidPatterns) {
            if (pattern.test(word)) {
                hasInvalidPattern = true;
                break;
            }
        }
        
        if (hasInvalidPattern) {
            continue;
        }
        
        // ✅ پاس شد - نگه‌داری
        filtered[word] = {
            frequency: count,
            stopwordRatio: stopwordRatio
        };
    }
    
    return filtered;
}


/**
 * بررسی اینکه آیا عبارت مرتبط است
 */
export function isRelevantPhrase(phrase) {
    const punctuation = /[.,،؛:;!؟?\-_)(}{[\]«»""'']/g;
    if (punctuation.test(phrase)) return false;
    
    const irrelevantPatterns = [
        /است که/, /بود که/, /می باشد/,
        /است در/, /است به/, /است از/, /است با/,
        /این که/, /آن که/, /برای که/,
        /^.+ است$/, /^.+ بود$/, /^است .+$/,
        /^در .+$/, /^به .+$/, /^از .+$/, /^با .+$/,
        /^.+ در$/, /^.+ به$/, /^.+ از$/, /^.+ با$/,
        /^که .+$/, /^.+ که$/,
        /محتوای موجود/, /^موجود/, /ویرایشگر/, /^ابزار/,
        /عمل کن/, /^کن/, /استفاده می/
    ];
    
    for (let pattern of irrelevantPatterns) {
        if (pattern.test(phrase)) return false;
    }
    
    const words = phrase.split(' ');
    const uniqueWords = new Set(words);
    if (words.length > uniqueWords.size) return false;
    
    // ✅ بررسی کلمات معنادار (بدون stopwords)
    const meaningfulWords = words.filter(w => 
        w.length > 2 && !stopwordsManager.isStopword(w)
    );
    
    if (words.length >= 3 && meaningfulWords.length < 2) return false;
    if (words.length === 2 && meaningfulWords.length < 1) return false;
    
    return true;
}

/**
 * ✅ لایه 1: Co-occurrence Analysis
 * یافتن عبارات همزمان با main keyword
 */
export function calculateCoOccurrence(phrase, mainKeyword, originalText) {
    if (!mainKeyword || !originalText) return 0;
    
    const normalizedKeyword = normalizeText(mainKeyword);
    const normalizedPhrase = normalizeText(phrase);
    
    // اگر خود phrase همان main keyword است، امتیاز ندهیم
    if (normalizedPhrase === normalizedKeyword) return 0;
    
    // استخراج جملات/پاراگراف‌ها
    const paragraphs = extractParagraphs(originalText);
    
    let coOccurrenceCount = 0;
    let totalPhraseOccurrence = 0;
    
    paragraphs.forEach(para => {
        const normalizedPara = normalizeText(para);
        
        // آیا این پاراگراف main keyword دارد؟
        const hasMainKeyword = normalizedPara.includes(normalizedKeyword);
        
        // آیا این پاراگراف phrase را دارد؟
        const hasPhrase = normalizedPara.includes(normalizedPhrase);
        
        if (hasPhrase) {
            totalPhraseOccurrence++;
            if (hasMainKeyword) {
                coOccurrenceCount++;
            }
        }
    });
    
    // نسبت همزمانی (0-1)
    if (totalPhraseOccurrence === 0) return 0;
    const coOccurrenceRatio = coOccurrenceCount / totalPhraseOccurrence;
    
    // امتیاز نهایی (0-25)
    return coOccurrenceRatio * 25;
}

/**
 * ✅ لایه 2: Context-based Scoring
 * امتیازدهی بر اساس موقعیت در ساختار محتوا
 */
export function calculateContextScore(phrase, originalText) {
    let score = 0;
    
    const parsed = parseHTML(originalText);
    const normalizedPhrase = normalizeText(phrase);
    
    // H1: +15
    const h1Elements = parsed.querySelectorAll('h1');
    h1Elements.forEach(h1 => {
        const h1Text = normalizeText(h1.textContent || '');
        if (h1Text.includes(normalizedPhrase)) {
            score += 15;
        }
    });
    
    // H2-H3: +10
    const h2h3Elements = parsed.querySelectorAll('h2, h3');
    h2h3Elements.forEach(h => {
        const hText = normalizeText(h.textContent || '');
        if (hText.includes(normalizedPhrase)) {
            score += 10;
        }
    });
    
    // پاراگراف اول: +8
    const firstPara = getFirstParagraph(originalText);
    const normalizedFirstPara = normalizeText(firstPara);
    if (normalizedFirstPara.includes(normalizedPhrase)) {
        score += 8;
    }
    
    // محدود کردن به حداکثر 20
    return Math.min(20, score);
}

/**
 * ✅ لایه 3: Proximity Score
 * اندازه‌گیری نزدیکی فیزیکی به main keyword
 */
export function calculateProximity(phrase, mainKeyword, originalText) {
    if (!mainKeyword || !originalText) return 0;
    
    const normalizedKeyword = normalizeText(mainKeyword);
    const normalizedPhrase = normalizeText(phrase);
    
    if (normalizedPhrase === normalizedKeyword) return 0;
    
    const sentences = originalText.split(/[.!?؟۔]+/).filter(s => s.trim().length > 0);
    
    let sameSentenceCount = 0;
    let nearSentenceCount = 0;
    let totalPhraseOccurrence = 0;
    
    sentences.forEach((sentence, index) => {
        const normalizedSentence = normalizeText(sentence);
        
        if (normalizedSentence.includes(normalizedPhrase)) {
            totalPhraseOccurrence++;
            
            // همان جمله
            if (normalizedSentence.includes(normalizedKeyword)) {
                sameSentenceCount++;
            } else {
                // جملات مجاور (±3 جمله)
                const window = 3;
                for (let offset = -window; offset <= window; offset++) {
                    if (offset === 0) continue;
                    const neighborIndex = index + offset;
                    if (neighborIndex >= 0 && neighborIndex < sentences.length) {
                        const neighborSentence = normalizeText(sentences[neighborIndex]);
                        if (neighborSentence.includes(normalizedKeyword)) {
                            nearSentenceCount++;
                            break;
                        }
                    }
                }
            }
        }
    });
    
    if (totalPhraseOccurrence === 0) return 0;
    
    // امتیازدهی: همان جمله = 15، نزدیک = 5
    const proximityScore = (sameSentenceCount * 15 + nearSentenceCount * 5) / totalPhraseOccurrence;
    
    return Math.min(15, proximityScore);
}

/**
 * ✅ لایه 4: Improved Quality Score
 * محاسبه کیفیت ساختاری عبارت
 */
export function calculateImprovedQuality(phrase, frequency, stopwordRatio = 0) {
    let quality = 0;
    const wordCount = phrase.split(' ').length;
    
    // 1. امتیاز تعداد کلمات (0-8)
    if (wordCount === 4) quality += 8;
    else if (wordCount === 3) quality += 6;
    else if (wordCount === 2) quality += 4;
    else quality += 1;
    
    // 2. امتیاز فرکانس پیوسته (0-10)
    quality += Math.min(10, Math.log2(frequency + 1) * 2);
    
    // 3. جریمه برای stopwords (0 تا -5)
    if (stopwordRatio > 0.5) {
        quality -= 5; // جریمه شدید
    } else if (stopwordRatio > 0.3) {
        quality -= 3; // جریمه متوسط
    } else if (stopwordRatio > 0.1) {
        quality -= 1; // جریمه خفیف
    }
    
    // 4. امتیاز طول مناسب (0-2)
    if (phrase.length >= 10 && phrase.length <= 50) {
        quality += 2;
    } else if (phrase.length > 50) {
        quality -= 2;
    }
    
    return Math.max(0, quality);
}

/**
 * ✅ محاسبه امتیاز نهایی (Multi-layer)
 */
export function calculateFinalScore(phrase, data, mainKeyword, originalText) {
    const { frequency, stopwordRatio } = data;
    
    // لایه‌های مختلف
    const coOccurrence = calculateCoOccurrence(phrase, mainKeyword, originalText);
    const contextScore = calculateContextScore(phrase, originalText);
    const proximityScore = calculateProximity(phrase, mainKeyword, originalText);
    const qualityScore = calculateImprovedQuality(phrase, frequency, stopwordRatio);
    
    // وزن‌دهی
    const finalScore = (
        (frequency * 0.20) +           // 20%
        (coOccurrence * 0.25) +        // 25%
        (contextScore * 0.20) +        // 20%
        (proximityScore * 0.15) +      // 15%
        (qualityScore * 0.20)          // 20%
    );
    
    return {
        finalScore: Math.round(finalScore * 10) / 10, // رند به یک رقم اعشار
        breakdown: {
            frequency: frequency,
            coOccurrence: Math.round(coOccurrence * 10) / 10,
            contextScore: Math.round(contextScore * 10) / 10,
            proximityScore: Math.round(proximityScore * 10) / 10,
            qualityScore: Math.round(qualityScore * 10) / 10
        }
    };
}

/**
 * ✅ لایه 5: Semantic Diversity (Clustering)
 * جلوگیری از پیشنهاد variations مشابه
 */
export function clusterSimilarPhrases(phrases) {
    const clusters = [];
    const used = new Set();
    
    phrases.forEach((phrase1, index1) => {
        if (used.has(index1)) return;
        
        const cluster = [index1];
        used.add(index1);
        
        phrases.forEach((phrase2, index2) => {
            if (index1 === index2 || used.has(index2)) return;
            
            // محاسبه شباهت
            const similarity = calculatePhraseSimilarity(phrase1.keyword, phrase2.keyword);
            
            if (similarity > 0.7) { // بیش از 70% مشابه
                cluster.push(index2);
                used.add(index2);
            }
        });
        
        clusters.push(cluster);
    });
    
    // از هر cluster، بهترین را انتخاب کن
    const diverse = clusters.map(cluster => {
        const candidates = cluster.map(i => phrases[i]);
        // بیشترین امتیاز
        return candidates.sort((a, b) => b.finalScore - a.finalScore)[0];
    });
    
    return diverse;
}

/**
 * محاسبه شباهت دو عبارت (0-1)
 */
function calculatePhraseSimilarity(phrase1, phrase2) {
    const words1 = new Set(phrase1.toLowerCase().split(/\s+/));
    const words2 = new Set(phrase2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * ✅ پیشنهاد کلمات کلیدی (نسخه Semantic)
 */
export function suggestKeywords(text, mainKeyword = '', maxSuggestions = 10) {
    logger.debug('🔍 شروع Semantic Keyword Analysis...');
    
    // 1. استخراج n-grams
    const wordCounts = countWordFrequencies(text);
    const filteredCounts = filterRelevantWords(wordCounts);
    
    logger.debug(`   - ${Object.keys(filteredCounts).length} عبارت فیلتر شده`);
    
    // 2. محاسبه امتیازات چندلایه
    const scoredPhrases = [];
    
    for (const [phrase, data] of Object.entries(filteredCounts)) {
        const wordCount = phrase.split(' ').length;
        if (wordCount < 2 || wordCount > 4) continue;
        
        const scoreData = calculateFinalScore(phrase, data, mainKeyword, text);
        
        scoredPhrases.push({
            keyword: phrase,
            frequency: data.frequency,
            stopwordRatio: data.stopwordRatio,
            finalScore: scoreData.finalScore,
            breakdown: scoreData.breakdown,
            type: wordCount === 2 ? 'دو کلمه' : wordCount === 3 ? 'سه کلمه' : 'چهار کلمه'
        });
    }
    
    logger.debug(`   - ${scoredPhrases.length} عبارت امتیازدهی شده`);
    
    // 3. مرتب‌سازی بر اساس امتیاز نهایی
    scoredPhrases.sort((a, b) => b.finalScore - a.finalScore);
    
    // 4. حذف تکراری‌های معنایی (clustering)
    const diverse = clusterSimilarPhrases(scoredPhrases.slice(0, maxSuggestions * 3));
    
    logger.debug(`   - ${diverse.length} عبارت منحصربه‌فرد`);
    
    // 5. برگرداندن top results
    const final = diverse.slice(0, maxSuggestions);
    
    logger.success(`✅ ${final.length} پیشنهاد کلمه کلیدی آماده شد`);
    
    return final;
}

/**
 * ✅ تشخیص کلمه کلیدی اصلی (با الگوریتم جدید)
 */
export function detectMainKeyword(text, maxSuggestions = 5) {
    const wordCount = countWords(text);
    
    // threshold های adaptive
    let scoreThreshold = wordCount < 200 ? 15 : 
                        wordCount < 400 ? 20 : 
                        wordCount < 700 ? 25 : 
                        wordCount < 1000 ? 30 : 35;
    
    // استفاده از suggestKeywords جدید
    const suggestions = suggestKeywords(text, '', maxSuggestions * 2);
    
    if (suggestions.length === 0) return [];
    
    // فیلتر بر اساس threshold
    let mainKeywords = suggestions.filter(s => s.finalScore >= scoreThreshold);
    
    if (mainKeywords.length < maxSuggestions) {
        mainKeywords = suggestions.slice(0, maxSuggestions);
    }
    
    // Map به فرمت قدیمی برای سازگاری
    return mainKeywords.slice(0, maxSuggestions).map(s => ({
        keyword: s.keyword,
        frequency: s.frequency,
        type: s.type,
        quality: Math.round(s.breakdown.qualityScore * 2), // scale به 0-20
        relevance: Math.round((s.breakdown.coOccurrence + s.breakdown.contextScore) / 2) // میانگین
    }));
}

/**
 * ✅ تشخیص کلمات کلیدی فرعی (با الگوریتم جدید)
 */
export function detectSecondaryKeywords(text, maxSuggestions = 10) {
    const wordCount = countWords(text);
    
    // threshold های adaptive
    let scoreThreshold = wordCount < 200 ? 10 : 
                        wordCount < 400 ? 15 : 
                        wordCount < 700 ? 20 : 
                        wordCount < 1000 ? 25 : 30;
    
    // استفاده از suggestKeywords جدید
    const suggestions = suggestKeywords(text, '', maxSuggestions * 2);
    
    if (suggestions.length === 0) return [];
    
    // فیلتر بر اساس threshold
    let secondaryKeywords = suggestions.filter(s => s.finalScore >= scoreThreshold);
    
    if (secondaryKeywords.length < maxSuggestions) {
        secondaryKeywords = suggestions.slice(0, maxSuggestions);
    }
    
    // Map به فرمت قدیمی برای سازگاری
    return secondaryKeywords.slice(0, maxSuggestions).map(s => ({
        keyword: s.keyword,
        frequency: s.frequency,
        type: s.type,
        quality: Math.round(s.breakdown.qualityScore * 2),
        relevance: Math.round((s.breakdown.coOccurrence + s.breakdown.contextScore) / 2)
    }));
}

/**
 * ⚠️ توابع deprecated (نگه‌داشته شده برای سازگاری)
 */
export function calculateKeywordQuality(keyword, frequency, textContext = null) {
    logger.warn('⚠️ calculateKeywordQuality deprecated - use calculateFinalScore instead');
    // فراخوانی نسخه جدید
    if (textContext) {
        const data = { frequency, stopwordRatio: 0 };
        const result = calculateFinalScore(keyword, data, '', textContext);
        return Math.round(result.breakdown.qualityScore * 2);
    }
    return Math.round(calculateImprovedQuality(keyword, frequency, 0));
}

export function calculateRelevance(phrase, text) {
    logger.warn('⚠️ calculateRelevance deprecated - use calculateFinalScore instead');
    const contextScore = calculateContextScore(phrase, text);
    return Math.round(contextScore * 1.5);
}

// Export همه توابع
export default {
    findKeyword,
    countKeyword,
    calculateKeywordDensity,
    generateNGrams,
    countWordFrequencies,
    filterRelevantWords,
    isRelevantPhrase,
    calculateCoOccurrence,
    calculateContextScore,
    calculateProximity,
    calculateImprovedQuality,
    calculateFinalScore,
    clusterSimilarPhrases,
    suggestKeywords,
    detectMainKeyword,
    detectSecondaryKeywords,
    // Deprecated
    calculateKeywordQuality,
    calculateRelevance
};
