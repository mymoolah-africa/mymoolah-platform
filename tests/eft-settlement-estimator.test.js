const { estimateEftSettlement } = require('../utils/eftSettlementEstimator');

describe('EFT settlement estimator', () => {
  const previousCutoff = process.env.SBSA_H2H_EFT_CUTOFF_SAST;
  const previousSaturday = process.env.SBSA_H2H_EFT_SATURDAY_PROCESSING;

  beforeEach(() => {
    process.env.SBSA_H2H_EFT_CUTOFF_SAST = '15:00';
    process.env.SBSA_H2H_EFT_SATURDAY_PROCESSING = 'true';
  });

  afterAll(() => {
    if (previousCutoff === undefined) delete process.env.SBSA_H2H_EFT_CUTOFF_SAST;
    else process.env.SBSA_H2H_EFT_CUTOFF_SAST = previousCutoff;

    if (previousSaturday === undefined) delete process.env.SBSA_H2H_EFT_SATURDAY_PROCESSING;
    else process.env.SBSA_H2H_EFT_SATURDAY_PROCESSING = previousSaturday;
  });

  it('uses same-day intake before the 15:00 SAST cutoff and next business-day availability', () => {
    const estimate = estimateEftSettlement(new Date('2026-04-23T10:00:00+02:00'));

    expect(estimate.reason).toBe('BEFORE_CUTOFF');
    expect(estimate.requestedExecutionDate).toBe('2026-04-23');
    expect(estimate.estimatedReceiverAvailabilityDate).toBe('2026-04-24');
  });

  it('rolls after-cutoff Friday submissions through Saturday intake to Monday availability', () => {
    const estimate = estimateEftSettlement(new Date('2026-04-24T16:05:00+02:00'));

    expect(estimate.reason).toBe('AFTER_CUTOFF');
    expect(estimate.requestedExecutionDate).toBe('2026-04-25');
    expect(estimate.estimatedReceiverAvailabilityDate).toBe('2026-04-28');
  });

  it('treats Saturday before cutoff as an intake day', () => {
    const estimate = estimateEftSettlement(new Date('2026-04-25T10:00:00+02:00'));

    expect(estimate.reason).toBe('SATURDAY_BEFORE_CUTOFF');
    expect(estimate.requestedExecutionDate).toBe('2026-04-25');
    expect(estimate.estimatedReceiverAvailabilityDate).toBe('2026-04-28');
  });
});
