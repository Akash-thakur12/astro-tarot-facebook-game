const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting full-route Puppeteer diagnostics...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  let logs = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logs.push({ route: page.url(), type: msg.type(), text: msg.text() });
    }
  });

  page.on('pageerror', error => {
    logs.push({ route: page.url(), type: 'pageerror', text: error.message });
  });

  page.on('requestfailed', request => {
    // ignore favicon or analytics if any, just care about app chunks/APIs
    logs.push({ route: page.url(), type: 'requestfailed', text: `${request.failure().errorText} ${request.url()}` });
  });

  const routes = [
    'http://localhost:5173/',
    'http://localhost:5173/tarot',
    'http://localhost:5173/ask-pandit',
    'http://localhost:5173/wheel',
    'http://localhost:5173/premium'
  ];

  for (const route of routes) {
    console.log(`Navigating to ${route} ...`);
    try {
      await page.goto(route, { waitUntil: 'networkidle2', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      logs.push({ route, type: 'navigation_error', text: err.message });
    }
  }

  await browser.close();

  console.log("--- CAPTURED ERRORS/WARNINGS ---");
  console.log(JSON.stringify(logs, null, 2));
})();