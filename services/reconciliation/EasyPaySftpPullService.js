/**
 * EasyPay SFTP Pull Service
 *
 * Pulls EasyPay-hosted SOF reconciliation files into the existing
 * GCS-backed supplier reconciliation inbound bucket.
 *
 * Credentials are read from environment variables that must be bound from
 * Secret Manager in deployed environments. Never log or persist credentials.
 *
 * @module services/reconciliation/EasyPaySftpPullService
 */

'use strict';

const path = require('path');
const fs = require('fs').promises;
const SftpClient = require('ssh2-sftp-client');
const { Storage } = require('@google-cloud/storage');
const EasyPayAdapter = require('./adapters/EasyPayAdapter');

const logger = {
  info: (...args) => console.log('[EasyPaySftpPullService]', ...args),
  error: (...args) => console.error('[EasyPaySftpPullService]', ...args),
  warn: (...args) => console.warn('[EasyPaySftpPullService]', ...args),
  debug: (...args) => console.log('[EasyPaySftpPullService]', ...args)
};

class EasyPaySftpPullService {
  constructor(options = {}) {
    this.storage = options.storage || new Storage();
    this.sftpFactory = options.sftpFactory || (() => new SftpClient());
    this.adapter = options.adapter || new EasyPayAdapter();

    this.host = options.host || process.env.EASYPAY_SFTP_HOST;
    this.port = Number(options.port || process.env.EASYPAY_SFTP_PORT || 9021);
    this.username = options.username || process.env.EASYPAY_SFTP_USERNAME;
    this.password = options.password || process.env.EASYPAY_SFTP_PASSWORD;
    this.remoteDir = options.remoteDir || process.env.EASYPAY_SFTP_REMOTE_DIR || '.';
    this.bucketName = options.bucketName || process.env.EASYPAY_SFTP_BUCKET_NAME || process.env.SFTP_BUCKET_NAME || 'mymoolah-sftp-inbound';
    this.gcsPrefix = this.normalisePrefix(options.gcsPrefix || process.env.EASYPAY_SFTP_GCS_PREFIX || 'easypay/');
    this.filePattern = options.filePattern || process.env.EASYPAY_SFTP_FILE_PATTERN || 'easy%.%';
    this.validateSof = String(options.validateSof ?? process.env.EASYPAY_SFTP_VALIDATE_SOF ?? 'true').toLowerCase() !== 'false';
    this.tmpDir = options.tmpDir || process.env.EASYPAY_SFTP_TMP_DIR || '/tmp/easypay-sftp';
  }

  get isConfigured() {
    return Boolean(this.host && this.port && this.username && this.password);
  }

  /**
   * Pull new EasyPay files into the inbound reconciliation bucket.
   *
   * @param {Object} options
   * @param {number} options.limit - Maximum files to pull in one run.
   * @returns {Promise<Object>} Summary of listed, uploaded, skipped, and failed files.
   */
  async pullNewFiles(options = {}) {
    const limit = Number(options.limit || process.env.EASYPAY_SFTP_PULL_LIMIT || 25);
    const summary = {
      bucket: this.bucketName,
      prefix: this.gcsPrefix,
      remoteDir: this.remoteDir,
      listed: 0,
      matched: 0,
      uploaded: 0,
      skipped: 0,
      failed: 0,
      files: []
    };

    if (!this.isConfigured) {
      throw new Error('EasyPay SFTP is not configured');
    }

    await fs.mkdir(this.tmpDir, { recursive: true });
    const sftp = this.sftpFactory();

    try {
      await sftp.connect({
        host: this.host,
        port: this.port,
        username: this.username,
        password: this.password,
        readyTimeout: Number(process.env.EASYPAY_SFTP_READY_TIMEOUT_MS || 30000)
      });

      logger.info('Connected to EasyPay SFTP', {
        host: this.host,
        port: this.port,
        remoteDir: this.remoteDir,
        bucket: this.bucketName,
        prefix: this.gcsPrefix
      });

      const remoteFiles = await sftp.list(this.remoteDir);
      summary.listed = remoteFiles.length;

      const candidates = remoteFiles
        .filter(file => this.isRegularFile(file))
        .filter(file => this.matchesPattern(file.name, this.filePattern))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .slice(0, limit);

      summary.matched = candidates.length;

      for (const remoteFile of candidates) {
        const result = await this.pullOneFile(sftp, remoteFile);
        summary.files.push(result);
        summary[result.status] = (summary[result.status] || 0) + 1;
      }

      logger.info('EasyPay SFTP pull completed', {
        listed: summary.listed,
        matched: summary.matched,
        uploaded: summary.uploaded,
        skipped: summary.skipped,
        failed: summary.failed
      });

      return summary;
    } finally {
      try {
        await sftp.end();
      } catch (error) {
        logger.warn('EasyPay SFTP disconnect warning', { message: error.message });
      }
    }
  }

  async pullOneFile(sftp, remoteFile) {
    const filename = path.basename(remoteFile.name);
    const remotePath = this.joinRemotePath(this.remoteDir, remoteFile.name);
    const destination = `${this.gcsPrefix}${filename}`;
    const localPath = path.join(this.tmpDir, filename);
    const bucket = this.storage.bucket(this.bucketName);
    const gcsFile = bucket.file(destination);

    try {
      const [exists] = await gcsFile.exists();
      if (exists) {
        logger.info('Skipping EasyPay SFTP file already in GCS', { filename, destination });
        return { filename, destination, status: 'skipped', reason: 'already_in_gcs' };
      }

      await sftp.fastGet(remotePath, localPath);

      if (this.validateSof) {
        await this.validateSofFile(localPath, filename);
      }

      await bucket.upload(localPath, {
        destination,
        metadata: {
          metadata: {
            source: 'easypay_sftp_pull',
            remoteName: filename,
            pulledAt: new Date().toISOString()
          }
        }
      });

      logger.info('Uploaded EasyPay SFTP file to GCS inbound prefix', { filename, destination });
      return { filename, destination, status: 'uploaded' };
    } catch (error) {
      logger.error('Failed to pull EasyPay SFTP file', {
        filename,
        destination,
        error: error.message
      });
      return { filename, destination, status: 'failed', reason: error.message };
    } finally {
      try {
        await fs.unlink(localPath);
      } catch (error) {
        // Local temp cleanup is best-effort.
      }
    }
  }

  async validateSofFile(localPath, filename) {
    const content = await fs.readFile(localPath, 'utf-8');
    const parsed = await this.adapter.parse(content, {
      supplier_name: 'EasyPay',
      timezone: 'Africa/Johannesburg'
    });

    if (!parsed.body || parsed.body.length === 0) {
      throw new Error(`EasyPay SOF file ${filename} contains no transactions`);
    }

    return parsed;
  }

  isRegularFile(file) {
    // ssh2-sftp-client uses '-' for files and 'd' for directories.
    return !file.type || file.type === '-';
  }

  matchesPattern(filename, pattern) {
    if (!pattern) return true;
    const basename = path.basename(filename);
    const regexPattern = pattern
      .replace(/%/g, '__WILDCARD__')
      .replace(/YYYY/g, '\\d{4}')
      .replace(/MM/g, '\\d{2}')
      .replace(/DD/g, '\\d{2}')
      .replace(/\./g, '\\.')
      .replace(/__WILDCARD__/g, '.+');
    return new RegExp(`^${regexPattern}$`, 'i').test(basename);
  }

  normalisePrefix(prefix) {
    const trimmed = String(prefix || '').replace(/^\/+/, '');
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  joinRemotePath(remoteDir, filename) {
    const cleanDir = String(remoteDir || '.').replace(/\/+$/, '');
    if (cleanDir === '.' || cleanDir === '') return filename;
    return `${cleanDir}/${filename}`;
  }
}

module.exports = EasyPaySftpPullService;
