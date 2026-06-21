const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '../assets/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// User-Agent that triggers TTF response from Google Fonts API
const USER_AGENT = 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

const FONTS_REQUEST = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap';

function fetchCss(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('🌐 Fetching CSS from Google Fonts...');
  try {
    const css = await fetchCss(FONTS_REQUEST);
    console.log('CSS fetched successfully.');
    
    const fontFaces = css.split('}');
    const downloadQueue = [];
    const seen = new Set();
    
    for (const face of fontFaces) {
      if (!face.includes('font-family')) continue;
      
      const familyMatch = face.match(/font-family:\s*'([^']+)'/);
      const weightMatch = face.match(/font-weight:\s*([0-9]+)/);
      const urlMatch = face.match(/url\((https:\/\/[^)]+\.ttf)\)/);
      
      if (familyMatch && weightMatch && urlMatch) {
        const family = familyMatch[1].replace(/\s+/g, '');
        const weight = weightMatch[1];
        const url = urlMatch[1];
        
        let weightName = 'Regular';
        if (weight === '500') weightName = 'Medium';
        if (weight === '600') weightName = 'SemiBold';
        if (weight === '700') weightName = 'Bold';
        if (weight === '800') weightName = 'ExtraBold';
        
        const filename = `${family}-${weightName}.ttf`;
        const dest = path.join(fontsDir, filename);
        
        if (!seen.has(filename)) {
          seen.add(filename);
          downloadQueue.push({ url, dest, filename });
        }
      }
    }
    
    console.log(`Found ${downloadQueue.length} unique fonts to download.`);
    for (const item of downloadQueue) {
      console.log(`Downloading ${item.filename}...`);
      await download(item.url, item.dest);
      console.log(`✓ Downloaded ${item.filename}`);
    }
    console.log('🎉 Fonts download completed successfully.');
  } catch (err) {
    console.error('❌ Error during font download process:', err);
  }
}

run();
