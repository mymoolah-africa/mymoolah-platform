#!/usr/bin/env node

/**
 * Generic Markdown to PDF Converter
 * Converts any .md file to a professional PDF document
 * 
 * Usage:
 *   node scripts/md-to-pdf.js <path-to-markdown-file>
 *   node scripts/md-to-pdf.js docs/integrations/EasyPay_API_Integration_Guide.md
 *   node scripts/md-to-pdf.js README.md
 */

const fs = require('fs');
const path = require('path');

// Get markdown file path from command line argument
const mdFilePath = process.argv[2];

if (!mdFilePath) {
  console.error('❌ Error: No markdown file specified');
  console.log('\nUsage:');
  console.log('  node scripts/md-to-pdf.js <path-to-markdown-file>');
  console.log('\nExamples:');
  console.log('  node scripts/md-to-pdf.js docs/integrations/EasyPay_API_Integration_Guide.md');
  console.log('  node scripts/md-to-pdf.js README.md');
  console.log('  node scripts/md-to-pdf.js docs/API_DOCUMENTATION.md');
  process.exit(1);
}

// Resolve file paths
const MD_FILE = path.resolve(mdFilePath);
const MD_DIR = path.dirname(MD_FILE);
const MD_BASENAME = path.basename(MD_FILE, path.extname(MD_FILE));
const OUTPUT_DIR = MD_DIR;
const PDF_FILE = path.join(OUTPUT_DIR, `${MD_BASENAME}.pdf`);
const HTML_FILE = path.join(OUTPUT_DIR, `${MD_BASENAME}.html`);

console.log('📄 Markdown to PDF Converter');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check if markdown file exists
if (!fs.existsSync(MD_FILE)) {
  console.error(`❌ Markdown file not found: ${MD_FILE}`);
  process.exit(1);
}

// Read markdown content
const markdown = fs.readFileSync(MD_FILE, 'utf8');

// Try to use marked library if available
let marked;
try {
  marked = require('marked');
} catch (e) {
  console.log('⚠️  marked library not found. Using basic converter.');
  marked = null;
}

// Create a clean HTML version that can be printed to PDF
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${MD_BASENAME} - MyMoolah Treasury Platform</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        
        h1 {
            color: #1a73e8;
            border-bottom: 3px solid #1a73e8;
            padding-bottom: 10px;
            margin-top: 30px;
            page-break-after: avoid;
        }
        
        h2 {
            color: #34a853;
            border-bottom: 2px solid #e8eaed;
            padding-bottom: 8px;
            margin-top: 25px;
            page-break-after: avoid;
        }
        
        h3 {
            color: #ea4335;
            margin-top: 20px;
            page-break-after: avoid;
        }
        
        h4 {
            color: #fbbc04;
            margin-top: 15px;
            page-break-after: avoid;
        }
        
        h5, h6 {
            color: #5f6368;
            margin-top: 15px;
            page-break-after: avoid;
        }
        
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        
        pre code {
            background: none;
            padding: 0;
            font-size: 0.9em;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            page-break-inside: avoid;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        th {
            background: #f5f5f5;
            font-weight: bold;
        }
        
        blockquote {
            border-left: 4px solid #1a73e8;
            padding-left: 15px;
            margin: 15px 0;
            color: #666;
            font-style: italic;
        }
        
        a {
            color: #1a73e8;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e8eaed;
            margin: 30px 0;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 5px 0;
        }
        
        img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
        }
        
        .toc {
            background: #f8f9fa;
            border: 1px solid #e8eaed;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .toc ul {
            list-style: none;
            padding-left: 0;
        }
        
        .toc li {
            margin: 5px 0;
        }
        
        .toc a {
            color: #1a73e8;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
            
            pre, table, blockquote, img {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
${convertMarkdownToHTML(markdown)}
</body>
</html>`;

// Convert markdown to HTML
function convertMarkdownToHTML(markdown) {
  if (marked) {
    // Use marked library for proper markdown parsing
    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    });
    return marked.parse(markdown);
  } else {
    // Basic converter fallback
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    
    // Convert code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Convert inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Convert horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    
    // Convert unordered lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    
    // Convert ordered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6])/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<li>)/g, '<ul>$1');
    html = html.replace(/(<\/li>)<\/p>/g, '$1</ul>');
    
    return html;
  }
}

// Write HTML file
fs.writeFileSync(HTML_FILE, htmlContent, 'utf8');
console.log(`✅ HTML file created: ${HTML_FILE}`);

// Try to generate PDF using puppeteer if available
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('⚠️  puppeteer not available. PDF will need to be generated manually.');
  puppeteer = null;
}

if (puppeteer) {
  console.log('📄 Generating PDF using puppeteer...');
  (async () => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: PDF_FILE,
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true
      });
      await browser.close();
      console.log(`✅ PDF generated successfully: ${PDF_FILE}`);
      const stats = fs.statSync(PDF_FILE);
      console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`\n📋 PDF is ready to share!`);
      process.exit(0);
    } catch (error) {
      console.error(`❌ PDF generation failed: ${error.message}`);
      console.log(`\n📋 Manual PDF Generation:`);
      console.log(`   1. Open the HTML file in your browser: ${HTML_FILE}`);
      console.log(`   2. Press Cmd+P (Mac) or Ctrl+P (Windows/Linux)`);
      console.log(`   3. Select "Save as PDF"`);
      console.log(`   4. Save as: ${PDF_FILE}`);
      process.exit(1);
    }
  })();
} else {
  console.log(`\n📋 Manual PDF Generation:`);
  console.log(`   1. Open the HTML file in your browser: ${HTML_FILE}`);
  console.log(`   2. Press Cmd+P (Mac) or Ctrl+P (Windows/Linux)`);
  console.log(`   3. Select "Save as PDF"`);
  console.log(`   4. Save as: ${PDF_FILE}`);
  console.log(`\n💡 Alternative: Use an online converter:`);
  console.log(`   - Upload ${HTML_FILE} to https://www.markdowntopdf.com/`);
  console.log(`   - Or use VS Code extension "Markdown PDF"`);
}
