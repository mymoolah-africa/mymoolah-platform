'use strict';

/**
 * Catalog display policy — which VAS / voucher LIST views use pre-computed vas_best_offers
 * (one winning supplier per duplicate slot) vs full product_variants.
 *
 * Optional MM_DEPLOYMENT_ENV (set in Cloud Run / process env, not in this file):
 *   - production → use best-offers table when populated (deduped catalog)
 *   - uat | staging | development | dev | test → show all active variants per supplier
 *
 * When MM_DEPLOYMENT_ENV is unset, behaviour matches the legacy rule:
 *   NODE_ENV === 'production' → best-offers path; otherwise full catalog.
 *
 * Does not load or alter secrets or supplier credentials.
 */

function useBestOffersCatalogDisplay() {
  const mm = (process.env.MM_DEPLOYMENT_ENV || '').trim().toLowerCase();
  if (mm === 'production') return true;
  if (['uat', 'staging', 'development', 'dev', 'test'].includes(mm)) return false;
  if (mm) {
    // Explicit but unknown value — stay close to legacy production gate
    return process.env.NODE_ENV === 'production';
  }
  return process.env.NODE_ENV === 'production';
}

module.exports = {
  useBestOffersCatalogDisplay
};
