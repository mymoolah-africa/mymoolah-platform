# Email Draft — Zapper SFTP: Follow-up to Dillon (Sample File + Test Handshake)

**To:** Dillon Poultney <Dillon.Poultney@zapper.com>
**CC:** Sarah-Lee Fortuin <sarahlee.ruiters@zapper.com>, Melissa Murray <melissa.murray@zapper.com>, Eric Herr <eric.herr@zapper.com>
**Subject:** Re: Signature requested on "MyMoolah_Balance confirmation Dec 25" — Zapper SFTP: key received, test file + sample request

---

COPY BELOW THIS LINE:

---

Hi Dillon,

Thanks — I have your public key and the source IP (52.213.37.176). That's everything I need from your side to provision the `zapper` SFTP user, add the firewall rule, and open the port for your connections. I'll aim to have that done this week.

Two small items left to close so we can go live with confidence:

1. MARK-OFF FILE FORMAT — NICE TO HAVE, NOT A BLOCKER

Our parser is already built against the column structure Sarah-Lee shared in the January recon extract:

    ZapperId, TransactionProcessorReference, PaymentCreatedUTCDate, ProcessedAmount,
    ZapperMerchantId, ZoomLoginMerchantName, OrganisationReference, PaymentMethodType,
    PaymentMethodTitle, TotalThirdPartyVouchersRedeemedAmount, TotalMerchantVouchersRedeemedAmount

The parser is header-based, so minor column re-ordering or additional columns on the end are fine — no changes needed on our side. If you can share even one real sample file (any day's production data, or a redacted/sanitised version if preferred), it lets us do a final sanity-check against live data. If a sample isn't readily to hand, we're happy to proceed with the Sarah-Lee structure and iterate if anything doesn't line up on the first production drop.

2. FILE NAMING CONVENTION

Our watcher currently expects the pattern: `zapper_markoff_YYYYMMDD.csv`

Is that the naming convention you'll use, or will it be something else (e.g. `ZapperMarkoff_YYYY-MM-DD.csv`, or embedded timestamps)? Just a one-liner back is enough — we can adjust the watcher pattern to match whatever you actually produce.

3. TEST FILE HANDSHAKE

Once I've provisioned your key and opened the firewall (likely end of the week), it would be great to do a quick end-to-end test:

  (a) I'll let you know the moment you're cleared to connect.
  (b) Please drop any small CSV file (even a 1-row dummy) into `inbox/` on sftp://34.35.137.166:5022.
  (c) I'll confirm on our side that:
        - the connection succeeded,
        - the file landed in our inbound storage,
        - our parser read it cleanly.

If you'd rather send a real day's mark-off file as the test file, even better — that would cover items 1, 2, and 3 in one go.

No rush — whatever fits your schedule. Just let me know once you're ready.

Best regards,

Andre Botes
andre@mymoolah.africa
www.mymoolah.africa
