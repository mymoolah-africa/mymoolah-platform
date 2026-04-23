Hi Colette,

Thank you for confirming on 2026-04-22 that H2H is live on production. We ran the penny test today and I wanted to share the round-trip results straight away and request your formal sign-off to go fully live.

The Pain.001 was a single R1.00 transaction uploaded to SBSA PROD /Outbox/ at <HH:MM:SS SAST> on <YYYY-MM-DD>. Debtor account 272406481, branch 002154 (our MyMoolah PROD profile). Beneficiary was my personal SBSA current account 10111730633 at branch 051001 — the same creditor that proved-good in RM7 on TEST on 2026-04-17. MsgId MM-PRODPENNY<…>, EndToEndId PROD-PENNY-<ts>-01, ReqdExctnDt <YYYY-MM-DD>, filename MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_<timestamp>.xml. The file structure is identical to the UAT RM7 submission — pain.001.001.03, ChrgBr CRED, InstrPrty NORM, BtchBookg true, single <CdtTrfTxInf>, R1.00 in ZAR.

ACK arrived in /Inbox/ at <HH:MM:SS SAST> (+<N>s after upload), GrpSts RCVD — clean acknowledgement from the PROD processor.

INTAUD_PRD arrived at <HH:MM:SS SAST> (+<N>s), GrpSts <PDNG|PART>, per-transaction Tx1 TxSts <PDNG|ACSP> on PROD-PENNY-<ts>-01. <Any AddtlInf, or none>.

FINAUD_PRD arrived at <HH:MM:SS SAST> (+<N>s), GrpSts <ACSP|PART>, per-transaction Tx1 TxSts <ACSP>. No UNP_DATA or VET_DATA response was observed within the 30-minute polling window — also consistent with UAT RM7.

As expected on PROD, there is no /BAS/ folder — we polled /Inbox/ only. All three response files are preserved under docs/test/sbsa-prod-penny-responses-<YYYY-MM-DD>/ with the original SBSA filenames intact, and the full report with exact timestamps is in docs/test/sbsa-sftp-prod-penny-report-<YYYY-MM-DD>.txt on our side. I'm happy to forward those to you if it would help your records.

Settlement: I've confirmed the R1.00 debit on account 272406481 on the <date> statement — the transaction settled same day and the narrative came through as expected. That closes the round-trip for us on the PROD profile, file level plus funds level.

Internally we have left the scheduled pollers and the app-level upload path gated OFF in production for this initial penny and done the upload manually from our sftp-1-vm gateway using the SBSA SSH key, exactly as we did in UAT. Now that the round-trip is proven on PROD, our next step is to flip those gates on (SBSA_SFTP_UPLOAD_ENABLED=true and the three pollers to scheduler mode), run a second R1.00 penny through the app-level GCS-gateway path to prove that pipe, and then consider ourselves fully live.

Could you please confirm formal sign-off on the PROD penny round-trip from your side, and let us know if there is anything on SBSA's side you'd like us to do before we enable the app-level path. We'd like to land that second penny and the go-live in the next working day or two so this stays top of mind on both sides.

Thank you very much for the quick turnaround on all of the UAT points and for getting PROD live — really appreciated.

Kind regards,
André
MyMoolah Treasury Platform
