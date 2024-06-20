const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index_new.html'));
});

app.post('/extract', async (req, res) => {
  const jobProfile = req.body.jobProfile;
  const maxPages = parseInt(req.body.maxPages);

  const data = await extractEmailsAndUrls(jobProfile, maxPages);
  res.json({ data });
});

async function extractEmailsAndUrls(jobProfile, maxPages) {
  const emailUrlMap = new Map();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `https://www.google.com/search?q=%22${jobProfile}%22+-intitle%3A%22profiles%22+-inurl%3A%22dir%2F+%22+%22gmail.com%22+site%3Alinkedin.com%2Fin%2F+OR+site%3Alinkedin.com%2Fpub%2F&start=${(pageNum - 1) * 10}`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(anchor => anchor.href);
    });

    const pageContent = await page.content();
    const emailRegex = /\b[A-Za-z0-9._%+-]+[A-Za-z][0-9]*@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = pageContent.matchAll(emailRegex);

    for (const match of emailMatches) {
      const email = match[0];
      const surroundingText = pageContent.substring(match.index - 300, match.index + 300);
      const linkMatch = surroundingText.match(/https:\/\/www\.linkedin\.com\/in\/[A-Za-z0-9_-]+/);

      if (linkMatch) {
        const url = linkMatch[0];
        if (!emailUrlMap.has(email)) {
          emailUrlMap.set(email, url);
        }
      } else if (!emailUrlMap.has(email)) {
        emailUrlMap.set(email, "didn't got url");
      }

      if (emailUrlMap.size >= 10) {
        break; // Stop if we have at least 10 emails
      }
    }

    if (emailUrlMap.size >= 10) {
      break; // Stop if we have at least 10 emails
    }
  }

  await browser.close();
  return Array.from(emailUrlMap).map(([email, url]) => ({ email, url }));
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
