'use strict';

const axios = require('axios');

async function fetchOfficialDocs(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 3,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      results.push({
        url,
        status: response.status,
        ok: true,
        fetchedAt: new Date().toISOString(),
        contentLength: typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length,
      });
    } catch (error) {
      results.push({
        url,
        ok: false,
        fetchedAt: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  fetchOfficialDocs,
};
