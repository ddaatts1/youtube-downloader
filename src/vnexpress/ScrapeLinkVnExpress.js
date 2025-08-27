const puppeteer = require("puppeteer");

module.exports = async (tab) => {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--start-maximized']
        });

        const page = await browser.newPage();
        const url = `https://vnexpress.net/${tab}`;
        await page.setViewport({ width: 1920, height: 1080 });

        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
        } catch (err) {
            console.error("❌ Không thể vào trang:", url);
            throw err;
        }

        await page.waitForSelector('a[data-medium^="Item-"]', { timeout: 10000 });

        const articleLinks = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[data-medium^="Item-"]'));
            const seen = new Set();
            const results = [];

            anchors.forEach(anchor => {
                const href = anchor.getAttribute('href');
                const title = anchor.getAttribute('title') || anchor.textContent.trim();

                if (!href || !href.startsWith('https://vnexpress.net')) return;

                try {
                    const url = new URL(href);
                    const cleanHref = `${url.origin}${url.pathname}`;
                    if (seen.has(cleanHref)) return;

                    seen.add(cleanHref);
                    results.push({ title, href: cleanHref });
                } catch (e) { }
            });

            return results;
        });

        console.log("✅ Scraped:", articleLinks.length, "bài viết");
        await browser.close();
        return articleLinks;

    } catch (e) {
        console.error("=========> error ScrapeLinkVNExpress:", e.message);
        if (browser) await browser.close();
        return [];
    }
};
