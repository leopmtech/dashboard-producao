/**
 * @fileoverview Teste de conectividade com Notion e Google Sheets usando credenciais reais
 */

import { analysisConfig } from '../config/analysisConfig.js';

async function testNotion() {
  const { token, endpointRetrieve } = analysisConfig.credentials.notion;
  try {
    const res = await fetch(endpointRetrieve, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(analysisConfig.performance.timeoutMs)
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    return { ok, status: res.status, sample: json?.title || json?.id || Object.keys(json || {}).length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testSheets() {
  const { endpoint } = analysisConfig.credentials.sheets;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(analysisConfig.performance.timeoutMs) });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    const sample = Array.isArray(json?.values) ? json.values[0] : undefined;
    return { ok, status: res.status, sample };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function runConnectionTest() {
  const [notion, sheets] = await Promise.all([testNotion(), testSheets()]);
  const result = { timestamp: new Date().toISOString(), notion, sheets };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

export default runConnectionTest;


