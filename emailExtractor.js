const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function extractEmails(jobProfile, maxPages) {
  const emails = new Set();

  const browser = await puppeteer.launch({
    headless: true, // Run in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `https://www.google.com/search?q=%22${jobProfile}%22+-intitle%3A%22profiles%22+-inurl%3A%22dir%2F+%22+%22gmail.com%22+site%3Alinkedin.com%2Fin%2F+OR+site%3Alinkedin.com%2Fpub%2F&start=${(pageNum - 1) * 10}`;
    await page.goto(url);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds

    const pageContent = await page.content();
    const emailRegex = /\b[A-Za-z0-9._%+-]+[A-Za-z][0-9]*@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(pageContent)) !== null) {
      const email = match[0];
      if (!email.includes('%')) {
        emails.add(email);
      }
    }
  }

  await browser.close();
  return Array.from(emails);
}

rl.question('Enter the job profile: ', (jobProfile) => {
  rl.question('Enter the maximum number of pages to scrape: ', async (maxPages) => {
    const emails = await extractEmails(jobProfile, parseInt(maxPages));
    console.log('Extracted emails:', emails);
    rl.close();
  });
});
