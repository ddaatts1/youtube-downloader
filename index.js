
const fs = require('fs');

const ScrapeLinkYoutube = require("./src/ScrapeLinkYoutube")
const ScrapeLinkVNExpress = require("./src/vnexpress/ScrapeLinkVnExpress")
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

// DownloadYoutube("https://www.youtube.com/watch?v=8uE_iTMxwdA","test.mp4",100)






async function getLinkVNExpress() {
    const filePath = "getLinkVNExpress.txt";
    let existingLinks = new Set();

    // đọc file cũ để tránh trùng
    if (fs.existsSync(filePath)) {
        const lines = fs.readFileSync(filePath, "utf8").split("\n");
        lines.forEach(line => {
            if (line.trim()) existingLinks.add(line.trim());
        });
    }

    const stream = fs.createWriteStream(filePath, { flags: "a" });

    // duyệt từ trang 1 đến 5 (ví dụ)
    for (let i = 2; i <= 5; i++) {
        const slug = i === 1 ? "thoi-su" : `thoi-su-p${i}`;
        console.log("➡️ Đang lấy:", slug);

        let links = [];
        try {
            links = await ScrapeLinkVNExpress(slug) || [];
        } catch (e) {
            console.error("❌ Lỗi scrape:", e.message);
            continue;
        }

        for (const item of links) {
            const link = item.href;
            if (!existingLinks.has(link)) {
                stream.write(link + "\n");
                existingLinks.add(link);
                console.log("➕ Thêm:", link);
            } else {
                console.log("⏭️ Bỏ qua trùng:", link);
            }
        }
    }

    stream.end();
    console.log("✅ Done, lưu vào", filePath);
}

getLinkVNExpress();

