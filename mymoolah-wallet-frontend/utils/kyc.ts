export function navigateToKycDocuments(intent?: string) {
  const base = '/kyc/documents';
  if (intent) return `${base}?intent=${encodeURIComponent(intent)}`;
  return base;
}

export function extractPostKycIntent(search: string) {
  const params = new URLSearchParams(search);
  return params.get('intent');
}

export function destinationAfterKyc(intent?: string | null) {
  if (!intent) return '/';
  if (intent === 'instant_payment') return '/payments/instant';
  if (intent === 'request_to_pay') return '/payments/request';
  return '/';
}
