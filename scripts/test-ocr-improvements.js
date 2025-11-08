#!/usr/bin/env node

/**
 * Test OCR Improvements for South African ID Documents
 * 
 * This script tests various OCR preprocessing strategies to improve
 * accuracy for South African ID book documents.
 */

require('dotenv').config();
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;

async function testOCRStrategies(imagePath) {
  console.log('🧪 Testing OCR Improvement Strategies\n');
  console.log('='.repeat(70));
  console.log(`📄 Image: ${imagePath}\n`);

  if (!await fs.access(imagePath).then(() => true).catch(() => false)) {
    console.log('❌ Image file not found');
    return;
  }

  const strategies = [
    {
      name: 'Strategy 1: High Contrast + Denoise',
      process: async (input) => {
        return await sharp(input)
          .rotate()
          .resize({ width: 2400, withoutEnlargement: true })
          .greyscale()
          .normalise()
          .sharpen({ sigma: 2, flat: 1, jagged: 2 })
          .modulate({ brightness: 1.1, saturation: 0 })
          .linear(1.2, -(128 * 0.2))
          .toBuffer();
      }
    },
    {
      name: 'Strategy 2: Adaptive Threshold',
      process: async (input) => {
        return await sharp(input)
          .rotate()
          .resize({ width: 2400, withoutEnlargement: true })
          .greyscale()
          .normalise()
          .threshold(128)
          .sharpen()
          .toBuffer();
      }
    },
    {
      name: 'Strategy 3: Color Channel Extraction (Green Background Removal)',
      process: async (input) => {
        const metadata = await sharp(input).metadata();
        return await sharp(input)
          .rotate()
          .resize({ width: 2400, withoutEnlargement: true })
          .extractChannel('red') // Extract red channel to reduce green background
          .greyscale()
          .normalise()
          .sharpen({ sigma: 2 })
          .linear(1.3, -(128 * 0.3))
          .toBuffer();
      }
    },
    {
      name: 'Strategy 4: Morphological Operations Simulation',
      process: async (input) => {
        return await sharp(input)
          .rotate()
          .resize({ width: 2400, withoutEnlargement: true })
          .greyscale()
          .normalise()
          .sharpen({ sigma: 3, flat: 0.5, jagged: 3 })
          .modulate({ brightness: 1.15 })
          .linear(1.4, -(128 * 0.4))
          .toBuffer();
      }
    },
    {
      name: 'Strategy 5: Multi-Scale Enhancement',
      process: async (input) => {
        return await sharp(input)
          .rotate()
          .resize({ width: 3000, withoutEnlargement: true })
          .greyscale()
          .normalise()
          .sharpen({ sigma: 2.5 })
          .modulate({ brightness: 1.1 })
          .gamma(1.2)
          .toBuffer();
      }
    }
  ];

  const results = [];

  for (const strategy of strategies) {
    console.log(`\n📋 Testing: ${strategy.name}`);
    console.log('-'.repeat(70));
    
    try {
      const processedBuffer = await strategy.process(imagePath);
      const tempPath = path.join(__dirname, '../uploads/kyc', `test_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, processedBuffer);

      // Test with different Tesseract configurations
      const configs = [
        { psm: 6, name: 'PSM 6 (Uniform Block)' },
        { psm: 11, name: 'PSM 11 (Sparse Text)' },
        { psm: 12, name: 'PSM 12 (OSD)' },
        { psm: 13, name: 'PSM 13 (Raw Line)' }
      ];

      for (const config of configs) {
        try {
          const { data } = await Tesseract.recognize(tempPath, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:/- ',
            preserve_interword_spaces: '1',
            psm: config.psm,
            oem: 1
          });

          const text = data.text || '';
          const confidence = data.confidence || 0;
          
          // Extract key information
          const idMatch = text.match(/\b(\d{13})\b/);
          const surnameMatch = text.toUpperCase().match(/\bSURNAME\b[:\s]*([A-Z' -]+)/) || 
                              text.toUpperCase().match(/\bVAN\b[:\s]*([A-Z' -]+)/);
          const namesMatch = text.toUpperCase().match(/\bFORENAMES?\b[:\s]*([A-Z' -]+)/) ||
                           text.toUpperCase().match(/\bVOORNAME\b[:\s]*([A-Z' -]+)/);

          results.push({
            strategy: strategy.name,
            config: config.name,
            textLength: text.length,
            confidence: confidence,
            idNumber: idMatch ? idMatch[1] : null,
            surname: surnameMatch ? surnameMatch[1].trim() : null,
            forenames: namesMatch ? namesMatch[1].trim() : null,
            textPreview: text.substring(0, 200)
          });

          console.log(`  ✅ ${config.name}: Confidence ${confidence.toFixed(1)}%`);
          if (idMatch) console.log(`     ID: ${idMatch[1]}`);
          if (surnameMatch) console.log(`     Surname: ${surnameMatch[1].trim()}`);
          if (namesMatch) console.log(`     Forenames: ${namesMatch[1].trim()}`);
        } catch (error) {
          console.log(`  ❌ ${config.name}: ${error.message}`);
        }
      }

      // Cleanup
      await fs.unlink(tempPath).catch(() => {});
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY - Best Results');
  console.log('='.repeat(70));

  const bestResults = results
    .filter(r => r.idNumber && r.surname)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  if (bestResults.length > 0) {
    console.log('\n🏆 Top 5 Results:\n');
    bestResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.strategy} - ${result.config}`);
      console.log(`   Confidence: ${result.confidence.toFixed(1)}%`);
      console.log(`   ID Number: ${result.idNumber}`);
      console.log(`   Surname: ${result.surname}`);
      console.log(`   Forenames: ${result.forenames || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('\n⚠️  No complete results found. All strategies need improvement.');
  }

  return bestResults;
}

// Run if called directly
if (require.main === module) {
  const imagePath = process.argv[2] || path.join(__dirname, '../uploads/kyc/test_id.jpg');
  
  testOCRStrategies(imagePath)
    .then(() => {
      console.log('\n✅ OCR Testing Complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { testOCRStrategies };

