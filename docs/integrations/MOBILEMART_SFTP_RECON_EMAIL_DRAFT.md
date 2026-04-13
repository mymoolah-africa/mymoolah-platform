# MobileMart SFTP Reconciliation — Email Draft

**Date**: 2026-04-13
**Status**: Ready to send (reply to Jarod's 13 January recon spec email)

---

**Subject**: Re: FTP Recon Spec - MyMoolah

**To**: Jarod Ramos <jarod@mobilemart.co.za>
**CC**: Cobus Fourie <cobus@mobilemart.co.za>, Mercia Botha <mercia@mobilemart.co.za>

---

Hi Jarod,

Thank you for the Reconciliation Extract specification (v1.1) you sent on 13 January. Apologies for the delayed follow-up on this.

I can confirm we have built our reconciliation parser to match your spec exactly:

- Pipe-delimited plain text with H / D / T record structure
- File naming: FULCRUM.MERCHANT.[NAME].RECON.[DATETIME].txt
- Header: H | version | date (CCYYMMDD)
- Body: all 24 fields at the positions specified (VAS Type, VAS Category, Provider, Fulcrum Transaction ID, Merchant Transaction ID, Transaction Type/Status, Date/Time, Tender Type, Amount in cents, Barcode, Product Name, Serial Number, MSISDN, Account Number, Meter Number, Unit Type, Units, Municipality, FBE fields, TenderPAN)
- Footer: T | record count (header + body + footer)
- Amount format: cents with implied decimal (e.g. 9900 = R99.00)

Our SFTP server is ready for you to connect and start uploading daily files. Please note the updated connection details below (the port and IP have changed since December):

Host: 34.35.137.166
Port: 5022
Username: mobilemart
Authentication: SSH public key (no passwords)
Upload directory: /home/mobilemart/

Files dropped into this directory are automatically picked up and processed by our reconciliation system.

To complete the setup, we need the following from your side:

1. Your SSH public key - so we can add it to the server and you can authenticate
2. Your source IP address(es) - for firewall whitelisting on our side
3. A test file upload - once connected, please upload a sample recon file so we can verify end-to-end processing

From our side, everything is ready:
- SFTP server live and accepting connections on port 5022
- Reconciliation file parser built and tested to your v1.1 spec
- Automated reconciliation pipeline with matching, discrepancy detection, and reporting
- GCS storage and immutable audit trail configured

Please let me know if you have any questions or if the spec has been updated since January.

Kind regards,
Andre Botes
Founder & CEO, MyMoolah
andre@mymoolah.africa
