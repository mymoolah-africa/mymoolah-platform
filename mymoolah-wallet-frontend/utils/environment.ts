import { APP_CONFIG } from '../config/app-config';

export function isWalletUatEnvironment(): boolean {
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? (import.meta as any).env
    : {};
  const deploymentEnv = String(
    viteEnv.VITE_NODE_ENV ||
    viteEnv.VITE_APP_ENV ||
    viteEnv.VITE_DEPLOYMENT_ENV ||
    ''
  ).toLowerCase();
  const apiBaseUrl = String(APP_CONFIG.API.baseUrl || '').toLowerCase();

  return viteEnv.DEV === true || deploymentEnv === 'uat' || apiBaseUrl.includes('uat');
}
