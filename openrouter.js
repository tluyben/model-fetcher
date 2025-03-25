const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeModels() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: "new"
  });
  
  try {
    const page = await browser.newPage();
    console.log('Navigating to https://openrouter.ai/models?fmt=table');
    await page.goto('https://openrouter.ai/models?fmt=table', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Extracting model data...');
    const modelsData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.table-fixed tbody tr'));
      
      return rows.map(row => {
        const modelLinkElement = row.querySelector('a.block.text-slate-11.underline');
        const modelName = modelLinkElement ? modelLinkElement.textContent.trim() : '';
        const modelHref = modelLinkElement ? modelLinkElement.getAttribute('href') : '';
        const modelCode = row.querySelector('code.text-xs') ? row.querySelector('code.text-xs').textContent.trim() : '';
        
        // Get price cells
        const priceTds = row.querySelectorAll('td.text-center');
        
        // Process prices: extract numeric value, convert to number * 100 if applicable
        const prices = Array.from(priceTds).map(td => {
          const priceText = td.textContent.trim();
          
          // If the price is "$0", convert to 0
          if (priceText === "$0") return 0;
          
          // If price is "--" or something non-numeric, keep that value
          if (priceText === "--" || !/\d/.test(priceText)) return priceText;
          
          // Extract numeric part and remove $ symbol
          const numericPart = priceText.replace(/[^\d.]/g, '');
          
          // If it's a valid number, convert to number and multiply by 100
          return numericPart ? parseFloat(numericPart) * 100 : priceText;
        });
        
        return {
          name: modelName,
          href: modelHref,
          code: modelCode,
          prices: prices
        };
      });
    });
    
    console.log(`Extracted ${modelsData.length} models`);
    
    // Create a more readable output format
    const outputData = {
      timestamp: new Date().toISOString(),
      totalModels: modelsData.length,
      models: modelsData
    };
    
    // Write to file
    fs.writeFileSync('openrouter_models.json', JSON.stringify(outputData, null, 2));
    
    // Print to console
    console.log(JSON.stringify(modelsData, null, 2));
    
    return modelsData;
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
}

// Run the scraper
scrapeModels();
