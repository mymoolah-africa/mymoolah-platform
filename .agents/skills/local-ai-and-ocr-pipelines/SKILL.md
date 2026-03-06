---
name: local-ai-and-ocr-pipelines
description: Implement scalable Node.js Machine Learning and OCR pipelines. Use this when working with @xenova/transformers (Transformers.js), Tesseract.js, KYC document processing, or anomaly detection on the server.
---

# MyMoolah Local AI & OCR Pipelines

Integrating machine learning (fraud detection, NLP) and Optical Character Recognition 
(OCR for KYC documents) directly into the Node.js backend requires strict adherence to 
event loop and memory management best practices. Poorly implemented ML models will block 
the Express server and crash under load.

## When This Skill Activates

- Writing KYC document processing logic (`Tesseract.js`).
- Implementing local AI inference (`@xenova/transformers`).
- Processing large PDFs or image streams (`pdf-parse`, `sharp`).
- Building ML anomaly detection for the reconciliation engine.

---

## 1. Golden Rules for Node.js ML

1. **Never block the Event Loop**: Heavy CPU tasks (like running an AI inference model or OCR) MUST NOT run synchronously on the main thread processing HTTP requests.
2. **Singleton Model Loading**: Machine learning models are huge. Load them ONCE per Node.js process and reuse the pipeline instance. Do not load models on every request.
3. **Stream Large Files**: Process uploaded KYC images via streams (`multer` memory storage should be minimized). Resize images with `sharp` BEFORE sending them to OCR/ML pipelines.

---

## 2. Singleton Model Pipeline Pattern (Transformers.js)

Cursor should use this pattern to instantiate `@xenova/transformers` models.

```javascript
// services/ai/pipeline.js
const { pipeline } = require('@xenova/transformers');
const logger = require('../../utils/logger');

class PipelineSingleton {
  static task = 'feature-extraction'; 
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;
  static initializationPromise = null;

  /**
   * Returns a singleton instance of the ML pipeline.
   * Uses a promise to prevent multiple concurrent initializations.
   */
  static async getInstance(progress_callback = null) {
    if (this.instance) {
      return this.instance;
    }
    
    if (!this.initializationPromise) {
      logger.info(`Loading local AI model: ${this.model}`);
      this.initializationPromise = pipeline(this.task, this.model, { 
        progress_callback 
      }).then((pipe) => {
        this.instance = pipe;
        logger.info(`AI model loaded successfully: ${this.model}`);
        return pipe;
      }).catch((error) => {
        this.initializationPromise = null;
        logger.error(`Failed to load AI model: ${this.model}`, error);
        throw error;
      });
    }

    return this.initializationPromise;
  }
}

module.exports = PipelineSingleton;
```

---

## 3. KYC Document OCR Pattern (Tesseract.js)

Images must be pre-processed (grayscale, normalized, resized) via `sharp` before being passed to `Tesseract.js` to dramatically improve text extraction speed and accuracy while saving memory.

```javascript
// services/kyc/ocrService.js
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const logger = require('../../utils/logger');

async function extractKycText(imageBuffer) {
  try {
    // 1. Pre-process image to save RAM and improve OCR accuracy
    const optimizedBuffer = await sharp(imageBuffer)
      .resize({ width: 1500, withoutEnlargement: true }) // Downscale massive 4K photos
      .grayscale() // Remove color data
      .normalize() // Boost contrast
      .toBuffer();

    // 2. Run OCR (Tesseract automatically uses WebAssembly / Worker threads)
    const { data: { text } } = await Tesseract.recognize(
      optimizedBuffer,
      'eng',
      { logger: m => logger.debug('OCR Progress', m) }
    );

    return text;
  } catch (error) {
    logger.error('OCR Extraction Failed', error);
    throw new Error('DOCUMENT_UNREADABLE');
  }
}

module.exports = { extractKycText };
```

---

## 4. Offloading Heavy AI using Worker Threads

If an ML task takes longer than 100ms, Cursor MUST implement it via Node.js Native Worker Threads or a task queue (like BullMQ) to keep the API responsive to other wallet users.

```javascript
// Example: Using Worker Threads for heavy ML batch processing
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // Main Express Thread
  module.exports.runAnomalyDetection = function(transactionData) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: transactionData });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  };
} else {
  // Worker Thread (Heavy lifting happens here)
  const PipelineSingleton = require('./PipelineSingleton');
  
  async function processML() {
    const pipe = await PipelineSingleton.getInstance();
    const result = await pipe(workerData);
    parentPort.postMessage(result);
  }
  
  processML();
}
```

---

## 5. Cursor Compatibility Checklist

- [ ] Does the AI model load as a globally cached singleton?
- [ ] Are images downscaled with `sharp` before running through OCR?
- [ ] Are heavy blocking tasks offloaded to Worker Threads or background queues?
- [ ] Is input sanitized (PDF/Image virus scanning, mime-type validation) before processing?
