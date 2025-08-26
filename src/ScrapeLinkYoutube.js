const puppeteer = require("puppeteer");

// return redirect link from youtube
module.exports = async (channel)=>{

    let browser = null;
    try {
        const launchOptions = {
            headless: false, // Run browser in headless mode (no UI)
            args: ['--start-maximized']

        };


        // Launch the browser
        browser = await puppeteer.launch(launchOptions);

        // Create a new page
        const page = await browser.newPage();

        const url = `https://www.youtube.com/@${channel}/videos`; // Replace with your desired video URL
        await page.setViewport({ width: 1920, height: 1080 });

        await  page.goto(url)
        // for (let i = 0; i < 1; i++) {
        //     await page.evaluate(() => {
        //         window.scrollBy(0, window.innerHeight);
        //     });
        //
        //     // Wait for 2 seconds
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        // }

        await page.waitForSelector('#dismissible');

        const videoInfos = await page.evaluate(() => {
            const videoElements = document.querySelectorAll('#dismissible');
            const videos = [];

            videoElements.forEach(videoElement => {
                const titleElement = videoElement.querySelector('#video-title-link');
                const title = titleElement ? titleElement.textContent.trim() : '';

                const href = titleElement ? titleElement.getAttribute('href') : '';

                const viewCountElement = videoElement.querySelector('.inline-metadata-item');
                const viewCount = viewCountElement ? viewCountElement.textContent.trim() : '';

                const dateElement = videoElement.querySelector('.inline-metadata-item');
                const date = dateElement ? dateElement.textContent.trim() : '';


                videos.push({ title, href, viewCount, date });
            });

            return videos;
        });

        console.log("Video Information:");
        console.log(videoInfos);
        await browser.close()

        return videoInfos

    }catch (e){
        console.log("=========> error ScrapeLinkYoutube: "+ e.message)
    }
}