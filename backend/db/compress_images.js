const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../../frontend/public/images');

const imagesToCompress = [
  { name: 'hero_banner.png', maxWidth: 1200, quality: 75 },
  { name: 'product_1.png', maxWidth: 600, quality: 70 },
  { name: 'product_2.png', maxWidth: 600, quality: 70 },
  { name: 'product_3.png', maxWidth: 600, quality: 70 },
  { name: 'product_4.png', maxWidth: 600, quality: 70 },
  { name: 'product_5.png', maxWidth: 600, quality: 70 },
  { name: 'product_6.png', maxWidth: 600, quality: 70 },
  { name: 'product_7.png', maxWidth: 600, quality: 70 },
  { name: 'product_8.png', maxWidth: 600, quality: 70 },
  { name: 'product_9.png', maxWidth: 600, quality: 70 },
  { name: 'product_10.png', maxWidth: 600, quality: 70 }
];

(async () => {
  console.log('=== Sharadha Product Image Compression ===');
  console.log(`Target directory: ${targetDir}`);
  
  if (!fs.existsSync(targetDir)) {
    console.error('❌ Target directory does not exist!');
    process.exit(1);
  }

  for (const imgConfig of imagesToCompress) {
    const imgPath = path.join(targetDir, imgConfig.name);
    if (!fs.existsSync(imgPath)) {
      console.log(`⚠️  Skipping ${imgConfig.name} - File not found.`);
      continue;
    }

    const beforeSize = fs.statSync(imgPath).size;
    console.log(`Processing ${imgConfig.name}... (Original: ${(beforeSize / 1024).toFixed(2)} KB)`);

    try {
      const image = await Jimp.read(imgPath);
      
      // Calculate aspect ratio and resize if wider than maxWidth
      if (image.bitmap.width > imgConfig.maxWidth) {
        const height = Math.round((image.bitmap.height / image.bitmap.width) * imgConfig.maxWidth);
        image.resize({ w: imgConfig.maxWidth, h: height });
      }
      
      // Get highly-compressed JPEG buffer
      const buf = await image.getBuffer('image/jpeg', { quality: imgConfig.quality });
      
      // Write buffer back to the original PNG path
      fs.writeFileSync(imgPath, buf);
      
      const afterSize = fs.statSync(imgPath).size;
      const reduction = ((beforeSize - afterSize) / beforeSize * 100).toFixed(1);
      console.log(`✅ Compressed & Converted ${imgConfig.name} -> ${(afterSize / 1024).toFixed(2)} KB (Reduced by ${reduction}%)`);
    } catch (err) {
      console.error(`❌ Error compressing ${imgConfig.name}:`, err.message || err);
    }
  }

  console.log('=== Image compression complete ===');
  process.exit(0);
})();
