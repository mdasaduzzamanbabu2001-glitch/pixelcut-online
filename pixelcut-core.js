// ==========================================================
// 🚀 PIXELCUT PRO ONLINE ENGINE (100% EXACT main.js FORMULA)
// ==========================================================
(function () {
    if (window.__pixelcutProOnlineLoaded) return;
    window.__pixelcutProOnlineLoaded = true;

    const ONLINE_VERSION = "2.0.1";
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    // ==========================================================
    // 1. FILE INPUT HOOK & ANTI-MINIMIZE KEEP-ALIVE (EXACT main.js)
    // ==========================================================
    (function installHooks() {
        try {
            Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
            Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
            Object.defineProperty(document, 'webkitHidden', { get: () => false, configurable: true });
            document.hasFocus = () => true;
            window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
        } catch (e) {}

        if (!window.__rafKeepAliveInstalled) {
            window.__rafKeepAliveInstalled = true;
            const origRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = function (cb) {
                let called = false;
                const timerId = setTimeout(() => {
                    if (!called) {
                        called = true;
                        cb(performance.now());
                    }
                }, 16);
                origRAF.call(window, (ts) => {
                    if (!called) {
                        called = true;
                        clearTimeout(timerId);
                        cb(ts);
                    }
                });
                return timerId;
            };
        }

        window.__lastClickedFileInput = null;
        window.__createdFileInputs = [];
        window.__interceptNextDownload = false;
        window.__downloadDoneResolver = null;
        window.__lastCreatedPngBlobUrl = null;

        try {
            delete window.showOpenFilePicker;
            delete Window.prototype.showOpenFilePicker;
        } catch (e) {
            window.showOpenFilePicker = undefined;
        }

        // Track Blob URLs created by Pixelcut during export
        const origCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function (obj) {
            const url = origCreateObjectURL.apply(this, arguments);
            try {
                if (obj && (obj.type === 'image/png' || obj.type === 'application/octet-stream')) {
                    window.__lastCreatedPngBlobUrl = url;
                }
            } catch (e) {}
            return url;
        };

        const origCreateElement = document.createElement;
        document.createElement = function (tagName, options) {
            const el = origCreateElement.call(this, tagName, options);
            const lower = String(tagName).toLowerCase();
            if (lower === 'input') {
                window.__createdFileInputs.push(el);
            }
            return el;
        };

        // Intercept both <input type="file"> click AND Pixelcut's raw <a download> click!
        const origHtmlClick = HTMLElement.prototype.click;
        HTMLElement.prototype.click = function () {
            if (this && this.tagName === 'INPUT' && this.type === 'file') {
                window.__lastClickedFileInput = this;
                if (!window.__createdFileInputs.includes(this)) {
                    window.__createdFileInputs.push(this);
                }
                return;
            }

            // Intercept Pixelcut's raw PNG download so we can run 5000px + 300 PPI + 2x Layer + AI Title first!
            if (this && this.tagName === 'A' && window.__interceptNextDownload && !this.__isFinalProcessedDownload) {
                const href = this.href || this.getAttribute('href') || '';
                if (href && (href.startsWith('blob:') || href.startsWith('data:') || this.hasAttribute('download'))) {
                    window.__interceptNextDownload = false;
                    (async () => {
                        try {
                            const res = await fetch(href);
                            const blob = await res.blob();
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                if (window.__downloadDoneResolver) {
                                    window.__downloadDoneResolver({ state: 'completed', dataUrl: reader.result });
                                    window.__downloadDoneResolver = null;
                                }
                            };
                            reader.readAsDataURL(blob);
                        } catch (err) {
                            if (window.__downloadDoneResolver) {
                                window.__downloadDoneResolver({ state: 'failed', dataUrl: null });
                                window.__downloadDoneResolver = null;
                            }
                        }
                    })();
                    return;
                }
            }
            return origHtmlClick.apply(this, arguments);
        };

        HTMLInputElement.prototype.click = function () {
            if (this.type === 'file') {
                window.__lastClickedFileInput = this;
                if (!window.__createdFileInputs.includes(this)) {
                    window.__createdFileInputs.push(this);
                }
                return;
            }
            return origHtmlClick.apply(this, arguments);
        };
    })();

    // ==========================================================
    // 🎯 2. 300 PPI (PIXELS/INCH) + 8-BIT sRGB PNG METADATA INJECTOR (EXACT main.js)
    // ==========================================================
    function setPng300PPI(pngUint8, ppi = 300) {
        try {
            const ppm = Math.round(ppi * 39.37007874); // 300 PPI = 11811 Pixels/Meter
            const crcTable = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
                }
                crcTable[n] = c >>> 0;
            }
            function calcCrc(buf) {
                let c = 0xffffffff;
                for (let i = 0; i < buf.length; i++) {
                    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
                }
                return (c ^ 0xffffffff) >>> 0;
            }

            const physChunk = new Uint8Array(21);
            const physView = new DataView(physChunk.buffer);
            physView.setUint32(0, 9, false);
            physChunk[4] = 0x70; // 'p'
            physChunk[5] = 0x48; // 'H'
            physChunk[6] = 0x59; // 'Y'
            physChunk[7] = 0x73; // 's'
            physView.setUint32(8, ppm, false);
            physView.setUint32(12, ppm, false);
            physChunk[16] = 1;
            const crc = calcCrc(physChunk.subarray(4, 17));
            physView.setUint32(17, crc, false);

            const signature = pngUint8.subarray(0, 8);
            const chunks = [signature];
            let offset = 8;
            const view = new DataView(pngUint8.buffer, pngUint8.byteOffset, pngUint8.byteLength);

            while (offset < pngUint8.length) {
                const length = view.getUint32(offset, false);
                const type = String.fromCharCode(
                    pngUint8[offset + 4],
                    pngUint8[offset + 5],
                    pngUint8[offset + 6],
                    pngUint8[offset + 7]
                );
                const totalChunkLen = 12 + length;
                const currentChunk = pngUint8.subarray(offset, offset + totalChunkLen);

                if (type === 'IHDR') {
                    chunks.push(currentChunk);
                    chunks.push(physChunk);
                } else if (type !== 'pHYs') {
                    chunks.push(currentChunk);
                }

                offset += totalChunkLen;
                if (type === 'IEND') break;
            }

            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
            const out = new Uint8Array(totalLen);
            let pos = 0;
            for (const c of chunks) {
                out.set(c, pos);
                pos += c.length;
            }
            return out;
        } catch (e) {
            return pngUint8;
        }
    }

    // ==========================================================
    // 🧠 3. 100% FREE UNLIMITED DUAL-CONTRAST VISION TITLE ENGINE (EXACT main.js)
    // ==========================================================
    const FREE_OCR_KEYS = [
        'helloworld',
        'K81899588988957',
        'K89565132488957',
        'K82798126788957',
        'K85951423188957'
    ];
    let ocrKeyIndex = 0;
    const savedNamesCounter = new Map();

    function httpPostRequest(urlStr, headers, bodyStr, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            if (typeof window.__gmRequest === 'function') {
                window.__gmRequest({
                    method: 'POST',
                    url: urlStr,
                    headers: headers,
                    data: bodyStr,
                    timeout: timeoutMs,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) resolve(res.responseText);
                        else reject(new Error(`HTTP ${res.status}`));
                    },
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('Request timeout'))
                });
                return;
            }

            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            fetch(urlStr, {
                method: 'POST',
                headers: headers,
                body: bodyStr,
                signal: ctrl.signal
            }).then(async (res) => {
                clearTimeout(timer);
                const txt = await res.text();
                if (res.ok) resolve(txt);
                else reject(new Error(`HTTP ${res.status}`));
            }).catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    async function prepareDualContrastImages(rawBase64DataUrl) {
        try {
            const img = new Image();
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = rawBase64DataUrl;
            });

            const box = 620;
            const scale = Math.min((box - 36) / (img.width || box), (box - 36) / (img.height || box));
            const w = Math.max(1, Math.round((img.width || box) * scale));
            const h = Math.max(1, Math.round((img.height || box) * scale));
            const ox = Math.round((box - w) / 2);
            const oy = Math.round((box - h) / 2);

            // ১. সাদা ব্যাকগ্রাউন্ড (কালো, গাঢ় সবুজ, গাঢ় লাল টেক্সটের জন্য)
            const cWhite = document.createElement('canvas');
            cWhite.width = box;
            cWhite.height = box;
            const ctxW = cWhite.getContext('2d');
            ctxW.fillStyle = '#FFFFFF';
            ctxW.fillRect(0, 0, box, box);
            ctxW.drawImage(img, ox, oy, w, h);

            // ২. কালো ব্যাকগ্রাউন্ড (সাদা, হলুদ, হালকা নীল টেক্সটের জন্য)
            const cBlack = document.createElement('canvas');
            cBlack.width = box;
            cBlack.height = box;
            const ctxB = cBlack.getContext('2d');
            ctxB.fillStyle = '#111111';
            ctxB.fillRect(0, 0, box, box);
            ctxB.drawImage(img, ox, oy, w, h);

            // ৩. উপর-নিচ একসাথে (Top = White BG, Bottom = Black BG)
            const cStacked = document.createElement('canvas');
            cStacked.width = box;
            cStacked.height = box * 2;
            const ctxS = cStacked.getContext('2d');
            ctxS.drawImage(cWhite, 0, 0);
            ctxS.drawImage(cBlack, 0, box);

            return {
                whiteDataUrl: cWhite.toDataURL('image/jpeg', 0.85),
                blackDataUrl: cBlack.toDataURL('image/jpeg', 0.85),
                stackedDataUrl: cStacked.toDataURL('image/jpeg', 0.82),
                boxSize: box
            };
        } catch (e) {
            return { whiteDataUrl: rawBase64DataUrl, blackDataUrl: rawBase64DataUrl, stackedDataUrl: rawBase64DataUrl, boxSize: 620 };
        }
    }

    function toStoreTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }

    function formatStoreReadyTitleFromText(rawText) {
        if (!rawText) return "";

        let text = rawText
            .replace(/\r?\n/g, ' ')
            .replace(/\bWR\s*[0O]?\s*NG\b/gi, 'Wrong')
            .replace(/\bL\s*[0O]?\s*VE\b/gi, 'Love')
            .replace(/\bH\s*[0O]?\s*PE\b/gi, 'Hope')
            .replace(/\bFA\s*[I1L]?\s*TH\b/gi, 'Faith')
            .replace(/\bSTR\s*[0O]?\s*NG\b/gi, 'Strong')
            .replace(/\bI\s*['’`]\s*m\b/gi, 'I Am')
            .replace(/\bI\s+m\b/gi, 'I Am')
            .replace(/\bI\s*['’`]\s*d\b/gi, 'I Would')
            .replace(/\bdon\s*['’`]\s*t\b/gi, 'Do Not')
            .replace(/\bcan\s*['’`]\s*t\b/gi, 'Can Not')
            .replace(/\bwon\s*['’`]\s*t\b/gi, 'Will Not')
            .replace(/\bit\s*['’`]\s*s\b/gi, 'It Is')
            .replace(/\bthat\s*['’`]\s*s\b/gi, 'That Is')
            .replace(/\bwhat\s*['’`]\s*s\b/gi, 'What Is')
            .replace(/\bshe\s*['’`]\s*s\b/gi, 'She Is')
            .replace(/\bhe\s*['’`]\s*s\b/gi, 'He Is')
            .replace(/\byou\s*['’`]\s*re\b/gi, 'You Are')
            .replace(/\bwe\s*['’`]\s*re\b/gi, 'We Are')
            .replace(/\bthey\s*['’`]\s*re\b/gi, 'They Are')
            .replace(/\bisn\s*['’`]\s*t\b/gi, 'Is Not')
            .replace(/\baren\s*['’`]\s*t\b/gi, 'Are Not')
            .replace(/\bdidn\s*['’`]\s*t\b/gi, 'Did Not')
            .replace(/\bdoesn\s*['’`]\s*t\b/gi, 'Does Not')
            .replace(/\blet\s*['’`]\s*s\b/gi, 'Let Us');

        const clauseParts = text.split(/\.\.\.|\bAS LONG AS\b|\bBECAUSE\b|\bTHEN ALWAYS\b|[?!;]/i);
        if (clauseParts.length > 1 && clauseParts[0].trim()) {
            const firstClauseWords = clauseParts[0].replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
            if (firstClauseWords.length >= 4) {
                text = clauseParts[0];
            }
        }

        const mainWordsCheck = text.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
        if (mainWordsCheck.length >= 6) {
            text = text.replace(/\b(T1D|TYPE\s*1|TYPE\s*2)?\s*AWARENESS\s*$/i, '').trim();
        }

        text = text.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        let words = text.split(' ').filter(w => w.length > 1 || /^[ia]$/i.test(w));
        if (words.length === 0) return "";

        if (words.length >= 8 && /^anymore$/i.test(words[words.length - 1])) {
            words.pop();
        }

        if (words.length > 9) {
            words = words.slice(0, 9);
        }

        const danglingEndings = new Set([
            'and', 'or', 'but', 'the', 'a', 'an', 'of', 'to', 'in',
            'on', 'for', 'with', 'by', 'about', 'that', 'because', 'as', 'is', 'are'
        ]);
        while (words.length > 3 && danglingEndings.has(words[words.length - 1].toLowerCase())) {
            words.pop();
        }

        const finalTitle = toStoreTitleCase(words.join(' '));
        return finalTitle.length >= 2 ? finalTitle : "";
    }

    async function scanWithFreeNeuralOcr(stackedDataUrl, boxSize) {
        for (let attempt = 0; attempt < 2; attempt++) {
            const activeOcrKey = FREE_OCR_KEYS[ocrKeyIndex % FREE_OCR_KEYS.length];
            ocrKeyIndex++;

            try {
                const postBody = new URLSearchParams({
                    apikey: activeOcrKey,
                    base64Image: stackedDataUrl,
                    language: 'eng',
                    OCREngine: '2',
                    isOverlayRequired: 'true',
                    scale: 'true'
                }).toString();

                const ocrTxt = await httpPostRequest(
                    'https://api.ocr.space/parse/image',
                    { 'Content-Type': 'application/x-www-form-urlencoded' },
                    postBody,
                    9500
                );

                const ocrJson = JSON.parse(ocrTxt);
                const parsedRes = ocrJson?.ParsedResults?.[0];
                if (!parsedRes) continue;

                const lines = parsedRes?.TextOverlay?.Lines || [];
                if (lines.length > 0) {
                    const topHalfLines = [];
                    const bottomHalfLines = [];

                    for (const ln of lines) {
                        const lineText = (ln.LineText || '').trim();
                        if (!lineText) continue;
                        const minTop = Number(ln.MinTop) || 0;
                        if (minTop < boxSize - 10) {
                            topHalfLines.push({ y: minTop, text: lineText });
                        } else {
                            bottomHalfLines.push({ y: minTop - boxSize, text: lineText });
                        }
                    }

                    topHalfLines.sort((a, b) => a.y - b.y);
                    bottomHalfLines.sort((a, b) => a.y - b.y);

                    const mergedLines = [...topHalfLines];
                    for (const bLine of bottomHalfLines) {
                        const existingIdx = mergedLines.findIndex(tLine => Math.abs(tLine.y - bLine.y) < 28);
                        if (existingIdx === -1) {
                            mergedLines.push(bLine);
                        } else {
                            const tClean = mergedLines[existingIdx].text.replace(/[^a-zA-Z0-9]/g, '');
                            const bClean = bLine.text.replace(/[^a-zA-Z0-9]/g, '');
                            if (bClean.length > tClean.length) {
                                mergedLines[existingIdx] = bLine;
                            }
                        }
                    }
                    mergedLines.sort((a, b) => a.y - b.y);

                    const topText = topHalfLines.map(l => l.text).join(' ');
                    const bottomText = bottomHalfLines.map(l => l.text).join(' ');
                    const mergedText = mergedLines.map(l => l.text).join(' ');

                    const candidates = [mergedText, topText, bottomText]
                        .map(t => formatStoreReadyTitleFromText(t))
                        .filter(Boolean);

                    if (candidates.length > 0) {
                        return candidates[0];
                    }
                }

                const rawParsed = (parsedRes.ParsedText || '').trim();
                if (rawParsed) {
                    const title = formatStoreReadyTitleFromText(rawParsed);
                    if (title) return title;
                }
            } catch (e) {}
        }
        return "";
    }

    async function scanWithLocalTesseractInWindow(whiteDataUrl, blackDataUrl) {
        try {
            if (!window.Tesseract) {
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
                    s.onload = res;
                    s.onerror = rej;
                    document.head.appendChild(s);
                });
            }
            if (!window.__ocrWorker) {
                window.__ocrWorker = await window.Tesseract.createWorker('eng');
            }
            const r1 = await window.__ocrWorker.recognize(whiteDataUrl);
            const t1 = (r1?.data?.text || '').trim();
            if (t1.replace(/[^a-zA-Z]/g, '').length >= 6) return formatStoreReadyTitleFromText(t1);

            const r2 = await window.__ocrWorker.recognize(blackDataUrl);
            const t2 = (r2?.data?.text || '').trim();
            return formatStoreReadyTitleFromText(t2.length > t1.length ? t2 : t1);
        } catch (e) {
            return "";
        }
    }

    async function generateAiTitleNode(rawBase64DataUrl, customApiKey) {
        const { whiteDataUrl, blackDataUrl, stackedDataUrl, boxSize } = await prepareDualContrastImages(rawBase64DataUrl);

        const userKey = (customApiKey || '').trim();
        if (userKey && (userKey.startsWith('sk-') || userKey.startsWith('ghp_') || userKey.startsWith('github_pat_'))) {
            try {
                const endpoint = userKey.startsWith('sk-')
                    ? 'https://api.openai.com/v1/chat/completions'
                    : 'https://models.inference.ai.azure.com/chat/completions';
                const payload = JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Read this T-shirt design carefully and output ONLY one catchy, store-upload-friendly title (3 to 8 words, Title Case, no quotes or punctuation).' },
                            { type: 'image_url', image_url: { url: stackedDataUrl } }
                        ]
                    }],
                    temperature: 0.1,
                    max_tokens: 40
                });
                const resTxt = await httpPostRequest(endpoint, { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userKey}` }, payload, 9000);
                const resJson = JSON.parse(resTxt);
                const reply = (resJson?.choices?.[0]?.message?.content || '').trim();
                const clean = formatStoreReadyTitleFromText(reply);
                if (clean) return clean;
            } catch (e) {}
        }

        const neuralTitle = await scanWithFreeNeuralOcr(stackedDataUrl, boxSize);
        if (neuralTitle) {
            console.log(`✅ [Store Title Generated]: ${neuralTitle}`);
            return neuralTitle;
        }

        const localTitle = await scanWithLocalTesseractInWindow(whiteDataUrl, blackDataUrl);
        if (localTitle) {
            console.log(`✅ [Local Engine Store Title]: ${localTitle}`);
            return localTitle;
        }

        return "Vintage Graphic Art Print";
    }

    // ==========================================================
    // ✂️ 4. PHOTOSHOP 5000x5000px (300 PPI) + 2x LAYER + TRIM & SAVE (EXACT main.js)
    // ==========================================================
    async function processTransparentPng5000pxTrimAndSave(dataUrl, readyTitle) {
        const img = new Image();
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = dataUrl;
        });

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        // ১. মেইন লেয়ার বসানো এবং Duplicate করে ২টি লেয়ার তৈরি (Photoshop Ctrl+J এর মতো)
        const c1 = document.createElement("canvas");
        c1.width = w;
        c1.height = h;
        const ctx1 = c1.getContext("2d", { willReadFrequently: true });
        ctx1.imageSmoothingEnabled = true;
        ctx1.imageSmoothingQuality = "high";

        ctx1.drawImage(img, 0, 0, w, h);
        ctx1.drawImage(img, 0, 0, w, h);

        // ২. চারপাশের খালি ট্রান্সপারেন্ট অংশ Trim করা (Alpha > 15)
        const imgDataObj = ctx1.getImageData(0, 0, w, h);
        const data = imgDataObj.data;

        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            const rowOffset = y * w * 4;
            for (let x = 0; x < w; x++) {
                if (data[rowOffset + x * 4 + 3] > 15) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY) {
            minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
        }

        const trimW = (maxX - minX) + 1;
        const trimH = (maxY - minY) + 1;

        // ৩. 5000x5000px টেমপ্লেট রেশিওতে Trim করা ফাইনাল আউটপুট তৈরি
        const maxTarget = 5000;
        const scale = maxTarget / Math.max(trimW, trimH);
        const finalW = Math.max(1, Math.round(trimW * scale));
        const finalH = Math.max(1, Math.round(trimW === trimH ? finalW : trimH * scale));

        const c2 = document.createElement("canvas");
        c2.width = finalW;
        c2.height = finalH;
        const ctx2 = c2.getContext("2d");
        ctx2.imageSmoothingEnabled = true;
        ctx2.imageSmoothingQuality = "high";

        ctx2.drawImage(c1, minX, minY, trimW, trimH, 0, 0, finalW, finalH);
        ctx2.drawImage(c1, minX, minY, trimW, trimH, 0, 0, finalW, finalH);

        const trimmedPngDataUrl = c2.toDataURL("image/png");
        const outB64 = trimmedPngDataUrl.replace(/^data:image\/png;base64,/, '');
        const binaryStr = atob(outB64);
        const rawBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            rawBytes[i] = binaryStr.charCodeAt(i);
        }

        // Inject 300 PPI pHYs Chunk
        const png300PpiBytes = setPng300PPI(rawBytes, 300);
        const finalBlob = new Blob([png300PpiBytes], { type: 'image/png' });
        const finalBlobUrl = URL.createObjectURL(finalBlob);

        const safeTitle = (readyTitle || 'Vintage Graphic Art').replace(/[\\/*?:"<>|]/g, '').trim() || 'Vintage Graphic Art';
        const count = savedNamesCounter.get(safeTitle) || 0;
        savedNamesCounter.set(safeTitle, count + 1);
        const finalFileName = count === 0 ? `${safeTitle}.png` : `${safeTitle} ${count}.png`;

        // Trigger Browser Download to Downloads Folder
        const a = document.createElement('a');
        a.__isFinalProcessedDownload = true;
        a.href = finalBlobUrl;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            try { document.body.removeChild(a); } catch (e) {}
        }, 2000);

        return { fileName: finalFileName, previewUrl: finalBlobUrl };
    }

    // ==========================================================
    // 🔍 5. DOM COORDS & REAL HARDWARE-LIKE CLICK ENGINE (EXACT main.js)
    // ==========================================================
    function getPixelcutElement(type) {
        function rectOf(el) {
            if (!el) return null;
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return null;
            return {
                el: el,
                x: r.left + r.width / 2,
                y: r.top + r.height / 2,
                width: r.width,
                height: r.height
            };
        }

        if (type === "homeRemoveBgBtn") {
            const rmImg = document.querySelector('img[alt="Remove BG"], img[alt*="Remove BG" i], img[src*="ai-tools-remove-bg"]');
            if (rmImg) {
                const cardDiv = rmImg.closest('div.cursor-pointer, button, [role="button"]') || rmImg.parentElement || rmImg;
                if (cardDiv && cardDiv.offsetWidth > 0 && cardDiv.offsetHeight > 0) {
                    return rectOf(cardDiv);
                }
            }
            const btn = Array.from(document.querySelectorAll('div.cursor-pointer, button, [role="button"]')).find(b => {
                if (b.closest('#pixelcut-pro-top-bar')) return false;
                const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                return (txt === 'remove bg' || txt.includes('remove background') || txt.includes('remove bg')) && b.offsetWidth > 0 && b.offsetHeight > 0;
            });
            return rectOf(btn);
        }

        if (type === "sidebarRemoveBgBtn") {
            const btn = Array.from(document.querySelectorAll('aside button, button')).find(b => {
                if (b.closest('#pixelcut-pro-top-bar')) return false;
                const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                return txt === 'remove background' && b.offsetWidth > 0 && b.offsetHeight > 0 && !b.disabled;
            });
            return rectOf(btn);
        }

        if (type === "cutoutReadyStatus") {
            const aside = document.querySelector('aside');
            const asideText = aside ? (aside.innerText || '').toLowerCase() : '';
            const hasBgPanel = asideText.includes('basic colors') || asideText.includes('add shadow');

            const topDlBtn = Array.from(document.querySelectorAll('aside button')).find(b =>
                (b.innerText || b.textContent || '').trim() === 'Download'
            );
            const hasSpinner = Boolean(
                document.querySelector('aside svg.animate-spin, main svg.animate-spin, [role="progressbar"], #pixelcut-spinner')
            );
            const isTopBtnReady = Boolean(
                topDlBtn &&
                topDlBtn.offsetWidth > 0 &&
                !topDlBtn.disabled &&
                !topDlBtn.className.includes('opacity-50') &&
                !hasSpinner
            );

            return {
                hasBgPanel,
                isTopBtnReady,
                topBtnRect: isTopBtnReady ? rectOf(topDlBtn) : null
            };
        }

        if (type === "firstDownloadBtn") {
            const topDlBtn = Array.from(document.querySelectorAll('aside button')).find(b =>
                (b.innerText || b.textContent || '').trim() === 'Download' && b.offsetWidth > 40
            );
            return rectOf(topDlBtn);
        }

        if (type === "secondPopupDownloadBtn") {
            const allDlBtns = Array.from(document.querySelectorAll('button')).filter(b => {
                if (b.closest('#pixelcut-pro-top-bar')) return false;
                const txt = (b.innerText || b.textContent || '').trim();
                return txt === 'Download' && b.offsetWidth > 40 && b.offsetHeight > 20 && !b.disabled;
            });

            if (allDlBtns.length >= 2) {
                const popupBtn = allDlBtns[allDlBtns.length - 1];
                return rectOf(popupBtn);
            }

            const popper = document.querySelector('[data-radix-popper-content-wrapper], [role="dialog"]');
            if (popper) {
                const btnInPopper = Array.from(popper.querySelectorAll('button')).find(b =>
                    (b.innerText || b.textContent || '').trim() === 'Download' && b.offsetWidth > 40 && !b.disabled
                );
                if (btnInPopper) return rectOf(btnInPopper);
            }
            return null;
        }

        return null;
    }

    async function cdpLikeClick(rectObj) {
        if (!rectObj) return;
        const rx = Math.round(rectObj.x);
        const ry = Math.round(rectObj.y);
        const targetEl = rectObj.el || document.elementFromPoint(rx, ry);
        if (!targetEl) return;

        const evOpts = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            clientX: rx,
            clientY: ry,
            button: 0,
            buttons: 1,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true
        };

        targetEl.dispatchEvent(new PointerEvent('pointerover', evOpts));
        targetEl.dispatchEvent(new MouseEvent('mouseover', evOpts));
        targetEl.dispatchEvent(new PointerEvent('pointermove', evOpts));
        targetEl.dispatchEvent(new MouseEvent('mousemove', evOpts));
        await wait(50);

        targetEl.dispatchEvent(new PointerEvent('pointerdown', evOpts));
        targetEl.dispatchEvent(new MouseEvent('mousedown', evOpts));
        if (typeof targetEl.focus === 'function') targetEl.focus();
        await wait(60);

        const upOpts = { ...evOpts, buttons: 0 };
        targetEl.dispatchEvent(new PointerEvent('pointerup', upOpts));
        targetEl.dispatchEvent(new MouseEvent('mouseup', upOpts));
        targetEl.dispatchEvent(new MouseEvent('click', upOpts));
        await wait(80);
    }

    async function resetToCreateHome() {
        // SPA Soft Reset to /create so our batch panel stays alive without full page reload
        const homeBtn = getPixelcutElement('homeRemoveBgBtn');
        if (homeBtn) return;

        const createLink = document.querySelector('a[href="/create"], a[href="https://www.pixelcut.ai/create"]');
        if (createLink) {
            createLink.click();
            await wait(1800);
            if (getPixelcutElement('homeRemoveBgBtn')) return;
        }

        window.history.pushState({}, '', '/create');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await wait(1800);
    }

    // ==========================================================
    // 🖥️ 6. FLOATING PRO DASHBOARD UI ON TOP OF PIXELCUT.AI
    // ==========================================================
    const bar = document.createElement('div');
    bar.id = 'pixelcut-pro-top-bar';
    bar.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #f8fafc; padding: 10px 18px; font-family: 'Segoe UI', system-ui, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.45); border-bottom: 2px solid #38bdf8;
        display: flex; align-items: center; justify-content: space-between; gap: 14px;
    `;

    bar.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <div style="background:#38bdf8; color:#0f172a; font-weight:800; padding:6px 10px; border-radius:8px; font-size:13px;">
                ⚡ PIXELCUT PRO ONLINE v${ONLINE_VERSION}
            </div>
            <label style="background:#2563eb; hover:#1d4ed8; color:#fff; padding:7px 14px; border-radius:7px; cursor:pointer; font-weight:600; font-size:13px; display:inline-block;">
                📂 Select Images
                <input id="ppro-file-picker" type="file" multiple accept="image/*" style="display:none;" />
            </label>
            <button id="ppro-start-btn" style="background:#10b981; color:#fff; border:none; padding:8px 16px; border-radius:7px; cursor:pointer; font-weight:700; font-size:13px;">
                🚀 Start Batch (0)
            </button>
            <input id="ppro-api-key" type="password" placeholder="Optional API Key (OpenAI/GH)" style="background:#0f172a; color:#e2e8f0; border:1px solid #334155; padding:6px 10px; border-radius:6px; font-size:12px; width:170px;" />
        </div>
        <div style="flex:1; max-width:460px;">
            <div id="ppro-status-text" style="font-size:12px; color:#93c5fd; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ✅ Ready! Select images to run 5000x5000px (300 PPI • 2x Layer) + AI Store Title.
            </div>
            <div style="width:100%; height:8px; background:#334155; border-radius:99px; overflow:hidden;">
                <div id="ppro-progress-fill" style="width:0%; height:100%; background:linear-gradient(90deg, #38bdf8, #10b981); transition:width 0.25s;"></div>
            </div>
        </div>
        <div id="ppro-gallery-strip" style="display:flex; align-items:center; gap:6px; overflow-x:auto; max-width:220px;"></div>
    `;

    document.body.appendChild(bar);
    document.body.style.paddingTop = '64px';

    let selectedFilesQueue = [];
    let isRunningBatch = false;

    const filePicker = document.getElementById('ppro-file-picker');
    const startBtn = document.getElementById('ppro-start-btn');
    const statusText = document.getElementById('ppro-status-text');
    const progressFill = document.getElementById('ppro-progress-fill');
    const apiKeyInput = document.getElementById('ppro-api-key');
    const galleryStrip = document.getElementById('ppro-gallery-strip');

    function setProgress(percent, text) {
        progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        statusText.textContent = text;
    }

    filePicker.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        selectedFilesQueue = [];
        setProgress(0, `⏳ Loading ${files.length} images into memory...`);

        for (const f of files) {
            const dataUrl = await new Promise((res) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.readAsDataURL(f);
            });
            selectedFilesQueue.push({ name: f.name, type: f.type || 'image/png', data: dataUrl });
        }

        startBtn.textContent = `🚀 Start Batch (${selectedFilesQueue.length})`;
        setProgress(0, `✅ ${selectedFilesQueue.length} images ready! Click "Start Batch" to begin.`);
    });

    // ==========================================================
    // 🚀 7. MAIN BATCH AUTOMATION LOOP (EXACT main.js STEP 1 -> STEP 6)
    // ==========================================================
    startBtn.addEventListener('click', async () => {
        if (isRunningBatch) return;
        if (selectedFilesQueue.length === 0) {
            alert('Please select images first!');
            return;
        }

        isRunningBatch = true;
        startBtn.disabled = true;
        startBtn.style.opacity = '0.6';

        const filesArray = [...selectedFilesQueue];
        const customApiKey = (apiKeyInput.value || '').trim();

        // ১. শুরুতেই প্যারালাল ব্যাকগ্রাউন্ডে সবগুলো ইমেজের AI Title স্ক্যান করে রেডি রাখা!
        const aiTitlesMap = new Map();
        (async () => {
            for (let idx = 0; idx < filesArray.length; idx++) {
                const fObj = filesArray[idx];
                const t = await generateAiTitleNode(fObj.data, customApiKey);
                aiTitlesMap.set(idx, t);
                await wait(350);
            }
        })();

        try {
            for (let i = 0; i < filesArray.length; i++) {
                const fileObj = filesArray[i];
                const fileLabel = `[${i + 1}/${filesArray.length}]`;

                let fileCompleted = false;
                for (let fileTry = 1; fileTry <= 3 && !fileCompleted; fileTry++) {
                    try {
                        setProgress(5, `${fileLabel} Loading Pixelcut Studio${fileTry > 1 ? ` (Retry ${fileTry})` : ''}...`);
                        await resetToCreateHome();
                        await wait(2200);

                        // STEP 1: হোমপেজে নতুন "Remove BG" কার্ডে ক্লিক করা
                        setProgress(18, `${fileLabel} Selecting Remove BG tool...`);
                        window.__lastClickedFileInput = null;

                        let homeBtnRect = null;
                        for (let a = 0; a < 35; a++) {
                            homeBtnRect = getPixelcutElement('homeRemoveBgBtn');
                            if (homeBtnRect) break;
                            await wait(300);
                        }
                        if (homeBtnRect) {
                            await cdpLikeClick(homeBtnRect);
                            await wait(450);
                        }

                        if (!window.__lastClickedFileInput) {
                            const rmImg = document.querySelector('img[alt="Remove BG"], img[alt*="Remove BG" i], img[src*="ai-tools-remove-bg"]');
                            const cardDiv = rmImg ? (rmImg.closest('div.cursor-pointer, button, [role="button"]') || rmImg.parentElement) : null;
                            if (cardDiv) cardDiv.click();
                        }
                        await wait(350);

                        // STEP 2: ইমেজ ফাইল ইনজেক্ট ও আপলোড করা
                        setProgress(32, `${fileLabel} Uploading image...`);
                        const res = await fetch(fileObj.data);
                        const blob = await res.blob();
                        const file = new File([blob], fileObj.name || 'image.png', { type: fileObj.type || blob.type || "image/png" });
                        const dt = new DataTransfer();
                        dt.items.add(file);

                        let input = window.__lastClickedFileInput;
                        if (!input && window.__createdFileInputs && window.__createdFileInputs.length > 0) {
                            const fileInps = window.__createdFileInputs.filter(el => el && el.type === 'file' && el.id !== 'ppro-file-picker');
                            if (fileInps.length > 0) input = fileInps[fileInps.length - 1];
                        }
                        if (!input) {
                            const allInputs = Array.from(document.querySelectorAll('input[type="file"]')).filter(el => el.id !== 'ppro-file-picker');
                            if (allInputs.length > 0) input = allInputs[allInputs.length - 1];
                        }

                        if (input) {
                            if (!input.isConnected) {
                                input.style.display = 'none';
                                document.body.appendChild(input);
                            }
                            if (input._valueTracker) {
                                try { input._valueTracker.setValue(''); } catch (e) {}
                            }
                            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files')?.set;
                            if (setter) setter.call(input, dt.files);
                            else input.files = dt.files;

                            input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                        } else {
                            const dropTarget = document.querySelector('main') || document.body;
                            const dropOpts = { bubbles: true, cancelable: true, dataTransfer: dt };
                            dropTarget.dispatchEvent(new DragEvent('dragenter', dropOpts));
                            dropTarget.dispatchEvent(new DragEvent('dragover', dropOpts));
                            dropTarget.dispatchEvent(new DragEvent('drop', dropOpts));
                        }

                        // STEP 3: এডিটর লোড হওয়া এবং "Remove background" বাটনে ক্লিক করা
                        setProgress(50, `${fileLabel} Waiting for Editor & AI Background Removal...`);
                        let rmClickCount = 0;
                        let lastRmClickStep = -5;
                        let cutoutReady = false;

                        for (let w = 0; w < 65; w++) {
                            await wait(1000);

                            if (rmClickCount < 3 && (w - lastRmClickStep) >= 3) {
                                const sideRmRect = getPixelcutElement('sidebarRemoveBgBtn');
                                if (sideRmRect) {
                                    setProgress(58, `${fileLabel} Clicking Remove Background...`);
                                    await cdpLikeClick(sideRmRect);
                                    rmClickCount++;
                                    lastRmClickStep = w;
                                    await wait(1200);
                                    continue;
                                }
                            }

                            const status = getPixelcutElement('cutoutReadyStatus');
                            if (status && status.hasBgPanel && status.isTopBtnReady && w >= 3) {
                                cutoutReady = true;
                                break;
                            }

                            setProgress(60 + Math.min(w, 20), `${fileLabel} AI is removing background... (${w + 1}s)`);
                        }

                        if (!cutoutReady) {
                            const fallbackBtn = getPixelcutElement('firstDownloadBtn');
                            if (!fallbackBtn) throw new Error("Top Download button not ready");
                        }

                        await wait(600);

                        // ডাউনলোড প্রমিজ রেডি করা
                        window.__interceptNextDownload = true;
                        window.__lastCreatedPngBlobUrl = null;
                        const downloadPromise = new Promise((resolve) => {
                            window.__downloadDoneResolver = resolve;
                            setTimeout(() => {
                                if (window.__downloadDoneResolver) {
                                    window.__downloadDoneResolver({ state: 'timeout', dataUrl: null });
                                    window.__downloadDoneResolver = null;
                                }
                            }, 45000);
                        });

                        // STEP 4: ১ম Download বাটনে ক্লিক করে পপআপ ওপেন করা
                        setProgress(85, `${fileLabel} Clicking 1st Download button...`);
                        let secondDlRect = null;

                        for (let openTry = 1; openTry <= 4; openTry++) {
                            secondDlRect = getPixelcutElement('secondPopupDownloadBtn');
                            if (secondDlRect) break;

                            const firstDlRect = getPixelcutElement('firstDownloadBtn');
                            if (!firstDlRect) throw new Error("1st Download button not found");

                            await cdpLikeClick(firstDlRect);

                            for (let poll = 0; poll < 26; poll++) {
                                await wait(500);
                                secondDlRect = getPixelcutElement('secondPopupDownloadBtn');
                                if (secondDlRect) break;
                            }

                            if (secondDlRect) break;
                        }

                        if (!secondDlRect) {
                            throw new Error("2nd Download button inside popup did not appear");
                        }

                        // STEP 5: পপআপের ভেতরের ২য় Download বাটনে ক্লিক করা!
                        await wait(1000);
                        secondDlRect = getPixelcutElement('secondPopupDownloadBtn') || secondDlRect;

                        setProgress(93, `${fileLabel} Clicking 2nd Download button...`);
                        await cdpLikeClick(secondDlRect);

                        await wait(1000);
                        const stillOpenRect = getPixelcutElement('secondPopupDownloadBtn');
                        if (stillOpenRect) {
                            await cdpLikeClick(stillOpenRect);
                        }

                        // STEP 6: ডাউনলোড কমপ্লিট ➔ 5000px Trim & AI Title সেভ!
                        setProgress(96, `${fileLabel} 📥 Exporting Transparent PNG...`);
                        const dlOutcome = await downloadPromise;

                        if (dlOutcome && dlOutcome.state === 'completed' && dlOutcome.dataUrl) {
                            let readyTitle = aiTitlesMap.get(i);

                            if (!readyTitle || readyTitle === "Vintage Graphic Art Print" || readyTitle.endsWith('Art')) {
                                readyTitle = await generateAiTitleNode(dlOutcome.dataUrl, customApiKey);
                                aiTitlesMap.set(i, readyTitle);
                            }

                            setProgress(98, `${fileLabel} ✂️ 5000x5000px (300 PPI • 2x Layer) Trim -> "${readyTitle}.png"...`);
                            const savedInfo = await processTransparentPng5000pxTrimAndSave(dlOutcome.dataUrl, readyTitle);

                            // Add thumbnail to top bar gallery
                            const thumb = document.createElement('img');
                            thumb.src = savedInfo.previewUrl;
                            thumb.title = savedInfo.fileName;
                            thumb.style.cssText = 'width:38px; height:38px; object-fit:contain; background:#fff; border-radius:5px; border:1px solid #38bdf8;';
                            galleryStrip.prepend(thumb);

                            setProgress(100, `${fileLabel} ✅ Saved: ${savedInfo.fileName}`);
                            fileCompleted = true;
                            await wait(3000);
                        } else {
                            throw new Error(`Download ${dlOutcome?.state || 'failed'}`);
                        }

                    } catch (err) {
                        console.error(`Attempt ${fileTry} error at ${fileLabel}: ${err.message}`);
                        if (fileTry === 3) {
                            setProgress(100, `${fileLabel} ❌ ${err.message}`);
                        }
                        await wait(2000);
                    }
                }
            }

            setProgress(100, "✅ All images processed, 5000x5000px (300 PPI • 2x Layer) trimmed & saved with AI Titles!");
        } finally {
            isRunningBatch = false;
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
        }
    });
})();
