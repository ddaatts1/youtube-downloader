// // src/extractArticles.js
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');
// const https = require('https');
// const { spawn } = require('child_process');
//
// const INPUT_FILE  = 'C:\\Users\\Admin\\Desktop\\codebackup\\youtube-downloader\\getLinkVNExpress.txt';
// const OUTPUT_FILE = 'article_data.jsonl';
// const IMG_DIR     = path.resolve('./images');
// const VID_DIR     = path.resolve('./videos');
//
// // ========== TIỆN ÍCH & CHUẨN BỊ ==========
// function ensureDir(dir) {
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// }
// ensureDir(IMG_DIR);
// ensureDir(VID_DIR);
//
// function nowTs() { return Date.now(); }
//
// // ========== TẢI ẢNH ==========
// function downloadImage(url, folder = IMG_DIR) {
//     try {
//         ensureDir(folder);
//         const ext = path.extname(new URL(url).pathname) || '.jpg';
//         const filename = `image_${nowTs()}${ext}`;
//         const filepath = path.join(folder, filename);
//
//         return new Promise((resolve, reject) => {
//             const file = fs.createWriteStream(filepath);
//             https.get(url, (res) => {
//                 if (res.statusCode !== 200) {
//                     file.close(); fs.unlink(filepath, ()=>{});
//                     return reject(new Error(`HTTP ${res.statusCode} khi tải ảnh: ${url}`));
//                 }
//                 res.pipe(file);
//                 file.on('finish', () => file.close(() => {
//                     console.log(`🖼️ Đã tải ảnh: ${filepath}`);
//                     resolve(filepath);
//                 }));
//             }).on('error', (err) => {
//                 file.close(); fs.unlink(filepath, ()=>{});
//                 reject(err);
//             });
//         });
//     } catch (e) {
//         console.error('❌ downloadImage error:', e.message);
//     }
// }
//
// // ========== TẢI VIDEO MP4 TRỰC TIẾP ==========
// function downloadVideo(url, folder = VID_DIR) {
//     try {
//         ensureDir(folder);
//         const ext = path.extname(new URL(url).pathname) || '.mp4';
//         const filename = `video_${nowTs()}${ext}`;
//         const filepath = path.join(folder, filename);
//
//         return new Promise((resolve, reject) => {
//             const file = fs.createWriteStream(filepath);
//             https.get(url, (res) => {
//                 if (res.statusCode !== 200) {
//                     file.close(); fs.unlink(filepath, ()=>{});
//                     return reject(new Error(`HTTP ${res.statusCode} khi tải video: ${url}`));
//                 }
//                 res.pipe(file);
//                 file.on('finish', () => file.close(() => {
//                     console.log(`🎬 Đã tải video: ${filepath}`);
//                     resolve(filepath);
//                 }));
//             }).on('error', (err) => {
//                 file.close(); fs.unlink(filepath, ()=>{});
//                 reject(err);
//             });
//         });
//     } catch (e) {
//         console.error('❌ downloadVideo error:', e.message);
//     }
// }
//
// // ========== TẢI VIDEO HLS (.m3u8) VỚI TIMEOUT ==========
// function downloadHLS(hlsUrl, folder = VID_DIR, timeoutMs = 90_000) {
//     ensureDir(folder);
//     const filename = `video_${nowTs()}.mp4`;
//     const filepath = path.join(folder, filename);
//
//     const referer = 'https://vnexpress.net/';
//     const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
//
//     return new Promise((resolve, reject) => {
//         console.log(`🎬 Bắt đầu tải: ${hlsUrl}`);
//         const args = [
//             '-headers', `Referer: ${referer}`,
//             '-user_agent', userAgent,
//             '-i', hlsUrl,
//             '-y',
//             '-c', 'copy',
//             filepath,
//         ];
//         console.log(`⚙️ Lệnh ffmpeg: ffmpeg ${args.map(a => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
//
//         const proc = spawn('ffmpeg', args, { windowsHide: true });
//
//         let timedOut = false;
//         const timer = setTimeout(() => {
//             timedOut = true;
//             proc.kill('SIGKILL');
//         }, timeoutMs);
//
//         proc.stderr.on('data', () => { /* muốn debug thì console.log(data.toString()) */ });
//
//         proc.on('close', (code) => {
//             clearTimeout(timer);
//             if (timedOut) {
//                 fs.unlink(filepath, ()=>{});
//                 return reject(new Error(`⏰ Quá thời gian tải HLS (${timeoutMs/1000}s): ${hlsUrl}`));
//             }
//             if (code === 0) {
//                 console.log(`✅ Đã tải video HLS: ${filepath}`);
//                 return resolve(filepath);
//             }
//             fs.unlink(filepath, ()=>{});
//             return reject(new Error(`❌ ffmpeg thoát với mã lỗi: ${code}`));
//         });
//
//         proc.on('error', (err) => {
//             clearTimeout(timer);
//             fs.unlink(filepath, ()=>{});
//             reject(err);
//         });
//     });
// }
//
// // ========== EXTRACT 1 BÀI ==========
// async function extractArticle(link, browser) {
//     let page;
//     try {
//         page = await browser.newPage();
//         await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
//         await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60_000 });
//
//         const article = await page.evaluate(() => {
//             const title = document.querySelector('h1.title-detail')?.innerText || '';
//             const date  = document.querySelector('.date')?.innerText || '';
//             const blocks = [];
//             const content = document.querySelector('.fck_detail') || document.querySelector('#main_detail');
//             if (content) {
//                 const els = content.querySelectorAll('p, figure img, video, iframe, .item_slide_show img, .desc_cation p');
//                 els.forEach(el => {
//                     if (el.tagName === 'P') {
//                         const text = el.innerText.trim();
//                         if (text) blocks.push({ type: 'text', value: text });
//                     } else if (el.tagName === 'IMG') {
//                         const src = el.src || el.getAttribute('data-src');
//                         if (src && !src.startsWith('data:')) blocks.push({ type: 'image', value: src });
//                     } else if (el.tagName === 'IFRAME') {
//                         const src = el.getAttribute('src');
//                         if (src) blocks.push({ type: 'video', value: src });
//                     } else if (el.tagName === 'VIDEO') {
//                         const src = el.querySelector('source')?.src || el.src;
//                         if (src) blocks.push({ type: 'video', value: src });
//                     }
//                 });
//             }
//             return { title, date, content: blocks };
//         });
//
//         article.url = link;
//
//         // tải file
//         for (const block of article.content) {
//             if (block.type === 'image') {
//                 await downloadImage(block.value).catch(e => console.warn('⚠️ Img:', e.message));
//             } else if (block.type === 'video') {
//                 if (block.value.endsWith('.mp4')) {
//                     await downloadVideo(block.value).catch(e => console.warn('⚠️ MP4:', e.message));
//                 } else if (block.value.includes('.m3u8')) {
//                     await downloadHLS(block.value).catch(e => console.warn('⚠️ HLS:', e.message));
//                 }
//             }
//         }
//
//         return article;
//     } catch (e) {
//         console.error(`❌ Lỗi khi xử lý ${link}: ${e.message}`);
//         return null;
//     } finally {
//         try { if (page) await page.close(); } catch (e) { /* ignore */ }
//     }
// }
//
// // ========== CHẠY TOÀN BỘ ==========
// async function run() {
//     console.log('🚀 Bắt đầu chạy extractor');
//
//     // Chẩn đoán input
//     if (!fs.existsSync(INPUT_FILE)) {
//         console.error(`❌ Không tìm thấy file input: ${INPUT_FILE}`);
//         process.exit(1);
//     }
//     const size = fs.statSync(INPUT_FILE).size;
//     if (size === 0) {
//         console.warn('⚠️ File input rỗng, không có URL để xử lý.');
//     }
//     console.log('📂 Đang đọc input từ:', INPUT_FILE, `(${size} bytes)`);
//
//     // Đọc toàn bộ file -> tách dòng -> lọc link hợp lệ
//     let rawText = '';
//     try {
//         rawText = fs.readFileSync(INPUT_FILE, 'utf8');
//     } catch (e) {
//         console.error('❌ Không thể đọc file input:', e.message);
//         process.exit(1);
//     }
//     const lines = rawText
//         .split(/\r?\n/)
//         .map(s => s.trim())
//         .filter(s => s && s.startsWith('http'));
//
//     console.log(`🧾 Tổng số dòng hợp lệ: ${lines.length}`);
//     if (lines.length > 0) {
//         console.log('🔎 3 dòng đầu:', lines.slice(0, 3));
//     }
//
//     const outStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
//
//     let browser = null;
//     async function startBrowser() {
//         if (browser) { try { await browser.close(); } catch(_){} }
//         browser = await puppeteer.launch({
//             headless: true,
//             args: ['--no-sandbox','--disable-setuid-sandbox'],
//             defaultViewport: { width: 1280, height: 800 }
//         });
//     }
//
//     await startBrowser();
//
//     for (let i = 0; i < lines.length; i++) {
//         const url = lines[i];
//         console.log(`➡ (${i+1}/${lines.length}) Đang xử lý: ${url}`);
//
//         try {
//             const article = await extractArticle(url, browser);
//             if (article) {
//                 outStream.write(JSON.stringify(article) + '\n');
//                 console.log(`✅ OK: ${article.title || '(không tiêu đề)'}`);
//             }
//         } catch (e) {
//             console.error('💥 Lỗi vòng lặp:', e.message);
//             // Thử khởi động lại trình duyệt nếu lỗi đến từ Puppeteer
//             try {
//                 console.log('♻️ Khởi động lại trình duyệt vì lỗi...');
//                 await startBrowser();
//             } catch (e2) {
//                 console.error('❌ Không thể khởi động lại browser:', e2.message);
//             }
//         }
//
//         // nghỉ ngắn giữa các URL để đỡ bị block
//         await new Promise(r => setTimeout(r, 1000));
//     }
//
//     try { if (browser) await browser.close(); } catch(_) {}
//     outStream.end();
//     console.log(`🎉 Đã lưu kết quả vào "${OUTPUT_FILE}"`);
// }
//
// run().catch(e => {
//     console.error('❌ Lỗi ngoài cùng:', e);
//     process.exit(1);
// });




// src/extractArticles.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

const INPUT_FILE  = 'C:\\Users\\Admin\\Desktop\\codebackup\\youtube-downloader\\getLinkVNExpress.txt';
const OUTPUT_FILE = 'article_data.jsonl';
const IMG_DIR     = path.resolve('./images');
const VID_DIR     = path.resolve('./videos');

// ========== TIỆN ÍCH & CHUẨN BỊ ==========
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(IMG_DIR);
ensureDir(VID_DIR);

function nowTs() { return Date.now(); }

// chuyển absolute path -> relative (dùng forward slash cho đẹp JSON)
function toRel(p) {
    const rel = path.relative(process.cwd(), p) || p;
    return rel.split(path.sep).join('/');
}

// ========== TẢI ẢNH ==========
function downloadImage(url, folder = IMG_DIR) {
    try {
        ensureDir(folder);
        const extOrigin = path.extname(new URL(url).pathname);
        const ext = extOrigin && extOrigin.trim() ? extOrigin : '.jpg';
        const filename = `image_${nowTs()}${ext}`;
        const filepath = path.join(folder, filename);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filepath);
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    file.close(); fs.unlink(filepath, ()=>{});
                    return reject(new Error(`HTTP ${res.statusCode} khi tải ảnh: ${url}`));
                }
                res.pipe(file);
                file.on('finish', () => file.close(() => {
                    console.log(`🖼️ Đã tải ảnh: ${filepath}`);
                    resolve(filepath); // trả về ABS, sẽ đổi sang REL khi ghi JSON
                }));
            }).on('error', (err) => {
                file.close(); fs.unlink(filepath, ()=>{});
                reject(err);
            });
        });
    } catch (e) {
        console.error('❌ downloadImage error:', e.message);
    }
}

// ========== TẢI VIDEO MP4 TRỰC TIẾP ==========
function downloadVideo(url, folder = VID_DIR) {
    try {
        ensureDir(folder);
        const extOrigin = path.extname(new URL(url).pathname);
        const ext = extOrigin && extOrigin.trim() ? extOrigin : '.mp4';
        const filename = `video_${nowTs()}${ext}`;
        const filepath = path.join(folder, filename);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filepath);
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    file.close(); fs.unlink(filepath, ()=>{});
                    return reject(new Error(`HTTP ${res.statusCode} khi tải video: ${url}`));
                }
                res.pipe(file);
                file.on('finish', () => file.close(() => {
                    console.log(`🎬 Đã tải video: ${filepath}`);
                    resolve(filepath); // trả về ABS
                }));
            }).on('error', (err) => {
                file.close(); fs.unlink(filepath, ()=>{});
                reject(err);
            });
        });
    } catch (e) {
        console.error('❌ downloadVideo error:', e.message);
    }
}

// ========== TẢI VIDEO HLS (.m3u8) VỚI TIMEOUT ==========
function downloadHLS(hlsUrl, folder = VID_DIR, timeoutMs = 90_000) {
    ensureDir(folder);
    const filename = `video_${nowTs()}.mp4`;
    const filepath = path.join(folder, filename);

    const referer = 'https://vnexpress.net/';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    return new Promise((resolve, reject) => {
        console.log(`🎬 Bắt đầu tải: ${hlsUrl}`);
        const args = [
            '-headers', `Referer: ${referer}`,
            '-user_agent', userAgent,
            '-i', hlsUrl,
            '-y',
            '-c', 'copy',
            filepath,
        ];
        console.log(`⚙️ Lệnh ffmpeg: ffmpeg ${args.map(a => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);

        const proc = spawn('ffmpeg', args, { windowsHide: true });

        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGKILL');
        }, timeoutMs);

        proc.stderr.on('data', () => { /* debug nếu cần */ });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (timedOut) {
                fs.unlink(filepath, ()=>{});
                return reject(new Error(`⏰ Quá thời gian tải HLS (${timeoutMs/1000}s): ${hlsUrl}`));
            }
            if (code === 0) {
                console.log(`✅ Đã tải video HLS: ${filepath}`);
                return resolve(filepath); // trả về ABS
            }
            fs.unlink(filepath, ()=>{});
            return reject(new Error(`❌ ffmpeg thoát với mã lỗi: ${code}`));
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            fs.unlink(filepath, ()=>{});
            reject(err);
        });
    });
}

// ========== EXTRACT 1 BÀI ==========
async function extractArticle(link, browser) {
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60_000 });

        const article = await page.evaluate(() => {
            const title = document.querySelector('h1.title-detail')?.innerText || '';
            const date  = document.querySelector('.date')?.innerText || '';
            const blocks = [];
            const content = document.querySelector('.fck_detail') || document.querySelector('#main_detail');
            if (content) {
                const els = content.querySelectorAll('p, figure img, video, iframe, .item_slide_show img, .desc_cation p');
                els.forEach(el => {
                    if (el.tagName === 'P') {
                        const text = el.innerText.trim();
                        if (text) blocks.push({ type: 'text', value: text });
                    } else if (el.tagName === 'IMG') {
                        const src = el.src || el.getAttribute('data-src');
                        if (src && !src.startsWith('data:')) blocks.push({ type: 'image', value: src });
                    } else if (el.tagName === 'IFRAME') {
                        const src = el.getAttribute('src');
                        if (src) blocks.push({ type: 'video', value: src });
                    } else if (el.tagName === 'VIDEO') {
                        const src = el.querySelector('source')?.src || el.src;
                        if (src) blocks.push({ type: 'video', value: src });
                    }
                });
            }
            return { title, date, content: blocks };
        });

        article.url = link;

        // === TẢI FILE & GHI LẠI TÊN FILE VÀO JSON ===
        const rewritten = [];
        for (const block of article.content) {
            try {
                if (block.type === 'image') {
                    const abs = await downloadImage(block.value);
                    if (abs) {
                        rewritten.push({ type: 'image', value: toRel(abs) });
                    }
                } else if (block.type === 'video') {
                    if (block.value.includes('.m3u8')) {
                        const abs = await downloadHLS(block.value);
                        if (abs) {
                            rewritten.push({ type: 'video', value: toRel(abs) });
                        }
                    } else if (block.value.endsWith('.mp4')) {
                        const abs = await downloadVideo(block.value);
                        if (abs) {
                            rewritten.push({ type: 'video', value: toRel(abs) });
                        }
                    } else {
                        // không nhận dạng được -> vẫn ghi URL gốc (hiếm)
                        rewritten.push(block);
                    }
                } else {
                    // text giữ nguyên
                    rewritten.push(block);
                }
            } catch (e) {
                console.warn(`⚠️ Bỏ qua block do lỗi tải: ${e.message}`);
            }
        }
        article.content = rewritten;

        return article;
    } catch (e) {
        console.error(`❌ Lỗi khi xử lý ${link}: ${e.message}`);
        return null;
    } finally {
        try { if (page) await page.close(); } catch (e) { /* ignore */ }
    }
}

// ========== CHẠY TOÀN BỘ ==========
async function run() {
    console.log('🚀 Bắt đầu chạy extractor');

    // Chẩn đoán input
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Không tìm thấy file input: ${INPUT_FILE}`);
        process.exit(1);
    }
    const size = fs.statSync(INPUT_FILE).size;
    if (size === 0) {
        console.warn('⚠️ File input rỗng, không có URL để xử lý.');
    }
    console.log('📂 Đang đọc input từ:', INPUT_FILE, `(${size} bytes)`);

    let rawText = '';
    try {
        rawText = fs.readFileSync(INPUT_FILE, 'utf8');
    } catch (e) {
        console.error('❌ Không thể đọc file input:', e.message);
        process.exit(1);
    }
    const lines = rawText
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s && s.startsWith('http'));

    console.log(`🧾 Tổng số dòng hợp lệ: ${lines.length}`);
    if (lines.length > 0) {
        console.log('🔎 3 dòng đầu:', lines.slice(0, 3));
    }

    const outStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });

    let browser = null;
    async function startBrowser() {
        if (browser) { try { await browser.close(); } catch(_){} }
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox','--disable-setuid-sandbox'],
            defaultViewport: { width: 1280, height: 800 }
        });
    }

    await startBrowser();

    for (let i = 0; i < lines.length; i++) {
        const url = lines[i];
        console.log(`➡ (${i+1}/${lines.length}) Đang xử lý: ${url}`);

        try {
            const article = await extractArticle(url, browser);
            if (article) {
                outStream.write(JSON.stringify(article) + '\n');
                console.log(`✅ OK: ${article.title || '(không tiêu đề)'}`);
            }
        } catch (e) {
            console.error('💥 Lỗi vòng lặp:', e.message);
            try {
                console.log('♻️ Khởi động lại trình duyệt vì lỗi...');
                await startBrowser();
            } catch (e2) {
                console.error('❌ Không thể khởi động lại browser:', e2.message);
            }
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    try { if (browser) await browser.close(); } catch(_) {}
    outStream.end();
    console.log(`🎉 Đã lưu kết quả vào "${OUTPUT_FILE}"`);
}

run().catch(e => {
    console.error('❌ Lỗi ngoài cùng:', e);
    process.exit(1);
});
