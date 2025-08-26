
const fs = require('fs');

const ScrapeLinkYoutube = require("./src/ScrapeLinkYoutube")
const DownloadYoutube = require("./src/DownloadYoutube")


async function getLinkYoutube() {
    const links = await ScrapeLinkYoutube("vtv24");

    // Load existing links from the file
    let existingLinks = new Set();
    try {
        const data = fs.readFileSync('resolved_links.txt', 'utf8');
        const lines = data.split('\n');
        lines.forEach(line => {
            if (line.trim() !== '') {
                existingLinks.add(line.trim());
            }
        });
    } catch (err) {
        console.error("Error reading file:", err);
    }


    // Create or append to the file
    const stream = fs.createWriteStream('resolved_links.txt', { flags: 'a' });

    for (let i = 0; i < links.length; i++) {
        const link = "https://www.youtube.com" + links[i].href;
        console.log("full link : " + link);

        // Check if the link is already written
        if (!existingLinks.has(link)) {
            // Write the link to the file
            stream.write(link + '\n');
            existingLinks.add(link); // Add the link to the set of existing links
        } else {
            console.log("Duplicate link found: " + link);
        }
    }

    // Close the stream
    stream.end();
}

// getLinkYoutube();

//

DownloadYoutube("https://www.youtube.com/watch?v=8uE_iTMxwdA","test.mp4",100)