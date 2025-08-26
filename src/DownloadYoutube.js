const puppeteer = require("puppeteer-extra")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
const axios = require("axios");
const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');

// module.exports = async (url, filePath,maxDuration) => {
//     let browser = null;
//     try {
//         const launchOptions = {
//             headless: false, // Run browser in headless mode (no UI)
//         };
//         puppeteer.use(StealthPlugin())
//
//         // Launch the browser
//         browser = await puppeteer.launch(launchOptions);
//
//         // Create a new page
//         const page = await browser.newPage();
//         await page.evaluateOnNewDocument(() => {
//             delete navigator.__proto__.webdriver;
//         });
//         await page.goto(`https://en.savefrom.net/1-youtube-video-downloader-586Wb/`);
//
//         // Input text into the input field
//         // await page.type('#url', url);
//
//         // Locate the input field using a selector
//         const inputSelector = 'input[name="sf_url"]';
//
//         // Type text into the input field
//         await page.type(inputSelector, url);
//
//         // Click the paste button
//         await page.click('form  .submit');
//         await new Promise(resolve => setTimeout(resolve, 5000));
//
//         await page.waitForSelector('.def-btn-box a');
//
//         // Evaluate the href attribute of the first download link
//         const link = await page.evaluate(() => {
//             const link = document.querySelector('.def-btn-box a');
//             return link.getAttribute('href');
//         });
//
//
//         console.log('First link href:', link);
//
//         const duration = await saveVideoWithMaxDuration(link, filePath, maxDuration,15000);
//
//         console.log("==============> download success !");
//         if (browser) {
//             await browser.close();
//         }
//         return { flag: true, duration: duration };
//     } catch (e) {
//         if (browser) {
//             await browser.close();
//         }
//         console.log("=====> error DownloadYoutube: " + e.message);
//         return { flag: false, duration: 0 };
//     }
// }


module.exports = async (url, filePath, maxDuration) => {
    let browser = null;
    try {
        const launchOptions = {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };

        puppeteer.use(StealthPlugin());
        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        await page.evaluateOnNewDocument(() => {
            delete navigator.__proto__.webdriver;
        });

        await page.goto('https://en.savefrom.net/1-youtube-video-downloader-586Wb/', {
            waitUntil: 'networkidle2'
        });

        const inputSelector = 'input[name="sf_url"]';
        await page.waitForSelector(inputSelector);
        await page.type(inputSelector, url);
        await page.click('form .submit');

        // Chờ các thẻ <a> xuất hiện
        await page.waitForFunction(() => {
            return Array.from(document.querySelectorAll('a')).some(a =>
                a.href.includes('googlevideo.com') && a.href.includes('itag=') && a.href.includes('videoplayback')
            );
        }, { timeout: 15000 });

        // Tìm đúng link thật
        const realLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const valid = anchors.find(a =>
                a.href.includes('googlevideo.com') &&
                a.href.includes('itag=') &&
                a.href.includes('videoplayback')
            );
            return valid ? valid.href : null;
        });

        if (!realLink) {
            throw new Error("Không tìm được link video thực.");
        }

        console.log('🎯 Real download link:', realLink);

        const duration = await saveVideoWithMaxDuration(realLink, filePath, maxDuration, 15000);
        console.log("✅ Tải video thành công!");

        await browser.close();
        return { flag: true, duration: duration };
    } catch (e) {
        if (browser) await browser.close();
        console.error("❌ Lỗi khi tải video:", e.message);
        return { flag: false, duration: 0 };
    }
}

async function saveVideoWithMaxDuration(url, filePath, maxDuration, timeout) {
    let response;
    try {
        response = await Promise.race([
            axios({
                url: url,
                method: 'GET',
                responseType: 'stream',
            }),
            new Promise((resolve, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
        ]);

        // Pipe the response data to a file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        // Return a promise to handle completion
        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                // Get video duration
                try {
                    const info = await new Promise((resolve, reject) => {
                        ffmpeg.ffprobe(filePath, (err, metadata) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(metadata);
                        });
                    });
                    const duration = info.format.duration;
                    if (duration <= maxDuration) {
                        resolve(duration);
                    } else {
                        // Delete the file if it exceeds the maximum duration
                        fs.unlinkSync(filePath);
                        reject(new Error(`Video duration exceeds ${maxDuration} seconds`));
                    }
                } catch (err) {
                    reject(err);
                }
            });
            writer.on('error', reject);
        });
    } catch (error) {
        if (response) {
            // Close the response stream if it exists
            response.data.destroy();
        }
        throw new Error(`Error downloading and saving the video: ${error.message}`);
    }
}

// async function saveVideoWithMaxDuration(url, filePath, maxDuration) {
//     try {
//         const response = await axios({
//             url: url,
//             method: 'GET',
//             responseType: 'stream',
//         });
//
//         // Pipe the response data to a file
//         const writer = fs.createWriteStream(filePath);
//         response.data.pipe(writer);
//
//         // Return a promise to handle completion
//         return new Promise((resolve, reject) => {
//             writer.on('finish', async () => {
//                 // Get video duration
//                 try {
//                     const info = await new Promise((resolve, reject) => {
//                         ffmpeg.ffprobe(filePath, (err, metadata) => {
//                             if (err) {
//                                 reject(err);
//                                 return;
//                             }
//                             resolve(metadata);
//                         });
//                     });
//                     const duration = info.format.duration;
//                     if (duration <= maxDuration) {
//                         resolve(duration);
//                     } else {
//                         // Delete the file if it exceeds the maximum duration
//                         fs.unlinkSync(filePath);
//                         reject(new Error(`Video duration exceeds ${maxDuration} seconds`));
//                     }
//                 } catch (err) {
//                     reject(err);
//                 }
//             });
//             writer.on('error', reject);
//         });
//     } catch (error) {
//         throw new Error(`Error downloading and saving the video: ${error.message}`);
//     }
// }
