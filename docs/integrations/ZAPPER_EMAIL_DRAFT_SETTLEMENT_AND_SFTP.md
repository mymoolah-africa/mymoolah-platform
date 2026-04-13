# Email Draft — Zapper Settlement & SFTP Setup

To: Dillon Poultney <Dillon.Poultney@zapper.com>, Sarah-Lee Fortuin <sarahlee.ruiters@zapper.com>
CC: Eric Herr <eric.herr@zapper.com>
Subject: MyMoolah — Float Pre-Fund, Settlement & SFTP Setup for Daily Mark-Off Files

---

COPY BELOW THIS LINE:

---

Hi Dillon & Sarah-Lee,

I trust you are both well.

I'd like to close out a few outstanding items between us so we can formalise the operational relationship going forward.


1. FLOAT PRE-FUND (R1,000) + SETTLEMENT (R82.80)

As per the signed balance confirmation (Dec 2025), we owe R82.80 for the three live test transactions (Wimpy R72.80, Easybet R5.00, Hollywood Bets R5.00).

I would also like to make an initial R1,000 EFT pre-fund into our Zapper float account.

I will combine both into a single EFT of R1,082.80. Please confirm the banking details and reference format from your email of 4 March still apply and I will process payment immediately.


3. SFTP FOR DAILY MARK-OFF FILES

Dillon, following up on your question from 5 March — yes, we have a production SFTP server ready for you to push the daily mark-off files to.

Connection details:

  Host:             34.35.137.166
  Port:             5022
  Username:         zapper
  Authentication:   SSH public key
  Target directory: inbox/

To complete the setup, I need from you:

  (a) Your SSH public key — we use key-based authentication only, no passwords.
  (b) Your source IP address(es) — for firewall whitelisting on our side.

Once I have these, I'll create the SFTP user and you can start pushing files.


4. MARK-OFF FILE FORMAT

Could you confirm the CSV column structure of the daily mark-off file? Based on the recon data Sarah-Lee shared in January, I'm expecting columns along the lines of:

  ZapperId, TransactionProcessorReference, PaymentCreatedUTCDate, ProcessedAmount, ZapperMerchantId, ZoomLoginMerchantName, OrganisationReference, PaymentMethodType, etc.

Please confirm or share a sample file so I can verify our parser is aligned.


5. SETTLEMENT FREQUENCY

Sarah-Lee, you mentioned settlement is required the day after the transaction is processed. Given our current low volumes, would it be acceptable to settle monthly or weekly until volumes increase? Happy to discuss what works best for your finance team.


Please let me know if you have any questions.

Best regards,

Andre Botes
andre@mymoolah.africa
www.mymoolah.africa
