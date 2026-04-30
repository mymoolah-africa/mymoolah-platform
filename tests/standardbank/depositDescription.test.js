jest.mock('../../models', () => ({}));
jest.mock('../../services/standardbank/inboundCreditEventService', () => ({}));

const {
  buildWalletDepositDescription,
  extractSenderNameFromPayload,
} = require('../../services/standardbankDepositNotificationService');

describe('standardbankDepositNotificationService deposit descriptions', () => {
  it('uses a neutral sender-based wallet description when sender name is provided', () => {
    expect(buildWalletDepositDescription({ senderName: 'Andre Botes' })).toBe('Deposit from Andre Botes');
  });

  it('derives sender name from bank narrative text when available', () => {
    expect(buildWalletDepositDescription({
      description: 'INSTANT EFT PAYMENT FROM Jane Smith REF 0825571055',
    })).toBe('Deposit from Jane Smith');
  });

  it('derives sender name from reference text that includes a sender and phone number', () => {
    expect(extractSenderNameFromPayload({
      referenceNumber: 'Andre Botes: 0825571055',
    })).toBe('Andre Botes');
  });

  it('does not show PayShap or EFT wording when no sender is available', () => {
    expect(buildWalletDepositDescription({
      description: '/PREF/ZA001960PAYSHAP PAYMENT FROM',
      referenceNumber: '0825571055',
    })).toBe('Deposit');
  });
});
