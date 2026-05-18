'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const EasyPaySftpPullService = require('../../services/reconciliation/EasyPaySftpPullService');

const SOF_SAMPLE = [
  'SOF,1,2138,20260211,093806,148',
  'X,TERM001,20260211,092001,000001,00014208557',
  'P,    439.00,      5.21,921381000007156909',
  'T,    439.00,      0.88,Cash',
  '1,439.00,5.21,1,439.00,0.88'
].join('\n');

function createMockStorage({ exists = false } = {}) {
  const upload = jest.fn().mockResolvedValue(undefined);
  const file = jest.fn(() => ({
    exists: jest.fn().mockResolvedValue([exists])
  }));
  const bucket = jest.fn(() => ({ file, upload }));

  return {
    storage: { bucket },
    upload,
    file
  };
}

function createMockSftp({ files, content = SOF_SAMPLE } = {}) {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue(files || [
      { name: 'easy2138.148', type: '-' },
      { name: 'notes.txt', type: '-' },
      { name: 'archive', type: 'd' }
    ]),
    fastGet: jest.fn(async (_remotePath, localPath) => {
      await fs.writeFile(localPath, content, 'utf-8');
    }),
    end: jest.fn().mockResolvedValue(undefined)
  };
}

describe('EasyPaySftpPullService', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'easypay-sftp-test-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('pulls matching EasyPay SOF files into the easypay GCS prefix', async () => {
    const mockSftp = createMockSftp();
    const { storage, upload, file } = createMockStorage();
    const service = new EasyPaySftpPullService({
      storage,
      sftpFactory: () => mockSftp,
      host: 'sftp.example.test',
      port: 9021,
      username: 'easy-user',
      password: 'secret',
      remoteDir: '/out',
      tmpDir
    });

    const summary = await service.pullNewFiles();

    expect(mockSftp.connect).toHaveBeenCalledWith(expect.objectContaining({
      host: 'sftp.example.test',
      port: 9021,
      username: 'easy-user',
      password: 'secret',
      tryKeyboard: true,
      onKeyboardInteractive: expect.any(Function)
    }));
    expect(mockSftp.fastGet).toHaveBeenCalledWith('/out/easy2138.148', expect.stringContaining('easy2138.148'));
    expect(file).toHaveBeenCalledWith('easypay/easy2138.148');
    expect(upload).toHaveBeenCalledWith(expect.stringContaining('easy2138.148'), expect.objectContaining({
      destination: 'easypay/easy2138.148'
    }));
    expect(summary).toMatchObject({
      listed: 3,
      matched: 1,
      uploaded: 1,
      skipped: 0,
      failed: 0
    });
  });

  it('strips trailing line breaks from SFTP secret values before connecting', async () => {
    const mockSftp = createMockSftp({ files: [] });
    const { storage } = createMockStorage();
    const service = new EasyPaySftpPullService({
      storage,
      sftpFactory: () => mockSftp,
      host: 'sftp.example.test\n',
      port: 9021,
      username: 'easy-user\r\n',
      password: 'secret\n',
      remoteDir: '.\n',
      tmpDir
    });

    await service.pullNewFiles();

    expect(mockSftp.connect).toHaveBeenCalledWith(expect.objectContaining({
      host: 'sftp.example.test',
      username: 'easy-user',
      password: 'secret'
    }));
    expect(mockSftp.list).toHaveBeenCalledWith('.');
  });

  it('skips files already present in the inbound GCS prefix', async () => {
    const mockSftp = createMockSftp({ files: [{ name: 'easy2138.149', type: '-' }] });
    const { storage, upload } = createMockStorage({ exists: true });
    const service = new EasyPaySftpPullService({
      storage,
      sftpFactory: () => mockSftp,
      host: 'sftp.example.test',
      username: 'easy-user',
      password: 'secret',
      tmpDir
    });

    const summary = await service.pullNewFiles();

    expect(mockSftp.fastGet).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ matched: 1, uploaded: 0, skipped: 1, failed: 0 });
  });

  it('uploads empty EasyPay files as no-transaction days without SOF validation failure', async () => {
    const mockSftp = createMockSftp({
      files: [{ name: 'easy2138.151', type: '-' }],
      content: ''
    });
    const { storage, upload } = createMockStorage();
    const service = new EasyPaySftpPullService({
      storage,
      sftpFactory: () => mockSftp,
      host: 'sftp.example.test',
      username: 'easy-user',
      password: 'secret',
      tmpDir
    });

    const summary = await service.pullNewFiles();

    expect(upload).toHaveBeenCalledWith(expect.stringContaining('easy2138.151'), expect.objectContaining({
      destination: 'easypay/easy2138.151',
      metadata: expect.objectContaining({
        metadata: expect.objectContaining({
          emptyNoTransactions: 'true'
        })
      })
    }));
    expect(summary).toMatchObject({ matched: 1, uploaded: 1, failed: 0 });
    expect(summary.files[0]).toMatchObject({ emptyNoTransactions: true });
  });

  it('accepts SOF files with a zero-count footer as no-transaction days', async () => {
    const mockSftp = createMockSftp({
      files: [{ name: 'easy2138.152', type: '-' }],
      content: 'SOF,1,2138,20260211,093806,152\n0,0.00,0.00,0,0.00,0.00'
    });
    const { storage, upload } = createMockStorage();
    const service = new EasyPaySftpPullService({
      storage,
      sftpFactory: () => mockSftp,
      host: 'sftp.example.test',
      username: 'easy-user',
      password: 'secret',
      tmpDir
    });

    const summary = await service.pullNewFiles();

    expect(upload).toHaveBeenCalledWith(expect.stringContaining('easy2138.152'), expect.objectContaining({
      destination: 'easypay/easy2138.152'
    }));
    expect(summary).toMatchObject({ matched: 1, uploaded: 1, failed: 0 });
  });

  it('fails closed when downloaded content is not a valid SOF file', async () => {
    const mockSftp = createMockSftp({
      files: [{ name: 'easy2138.150', type: '-' }],
      content: 'BAD,1,2138,20260211,093806,148\nX,TERM001,20260211,092001,000001,00014208557'
    });
    const { storage, upload } = createMockStorage();
    const service = new EasyPaySftpPullService({
      storage,
      sftpFactory: () => mockSftp,
      host: 'sftp.example.test',
      username: 'easy-user',
      password: 'secret',
      tmpDir
    });

    const summary = await service.pullNewFiles();

    expect(upload).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ matched: 1, uploaded: 0, failed: 1 });
    expect(summary.files[0].reason).toContain('Invalid SOF header');
  });
});
