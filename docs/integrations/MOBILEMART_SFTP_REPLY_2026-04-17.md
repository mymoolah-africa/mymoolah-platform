# MobileMart SFTP Reply — 2026-04-17

**Status**: Draft ready to send (via Gmail by André)
**Thread**: "Re: FTP Recon Spec - MyMoolah"
**To**: Jarod Ramos <jarod@mobilemart.co.za>
**CC**: Cobus Fourie <cobus@mobilemart.co.za>, Mercia Botha <mercia@mobilemart.co.za>, Selwyn <selwyn@mobilemart.co.za>

---

## Context

Jarod delivered his SSH public key on 17 Apr 2026 and asked whether we could whitelist the 62 Microsoft Power Automate egress IPs. After verifying with Microsoft's own documentation that Power Automate's cloud SFTP connector does not honour on-premises data gateway or Azure VNet NAT for egress, we declined the 62-range whitelist and proposed three alternative single-/32 paths.

## Key fingerprint (from attached file)

- Attachment: `Mobilemart SSH Key Public.pub`
- Comment: `jarod ramos@DESKTOP-IMKB1RA`
- Algorithm: RSA 2048
- SHA256: `SHA256:jcdpQXZJSz4X2ZNekQtuBd5w2IZj97rmkaZRXdK6aIQ`
- MD5: `38:de:34:cb:08:fd:ec:ce:34:47:e4:7f:f5:56:5b:bf`

## Reply sent (body)

Hi Jarod,

Thank you — the public SSH key has been received safely. For your records, the fingerprints on the key you attached are:

- SHA256: `SHA256:jcdpQXZJSz4X2ZNekQtuBd5w2IZj97rmkaZRXdK6aIQ`
- MD5: `38:de:34:cb:08:fd:ec:ce:34:47:e4:7f:f5:56:5b:bf`
- Algorithm: RSA 2048, comment `jarod ramos@DESKTOP-IMKB1RA`

Please confirm those match what you generated on your side before we install it — that way we know nothing was altered in transit.

On the 62-IP request: I have to be upfront. As a banking-grade treasury platform we operate under ISO 27001 and SARB prudential expectations, and every partner allowlist on our SFTP gateway has to be a deterministic single static IP (or a tightly scoped CIDR belonging to your organisation). Whitelisting a shared Microsoft Azure pool of 62 ranges — which any Power Automate tenant in the world could egress from — is not a control I can defend in an external audit, even though the actual security still rests on your SSH private key. I know that's not what you were hoping to hear, so let me lay out what actually works.

I checked this carefully with Microsoft's own documentation, because I wanted to be sure before pushing back. The Power Automate cloud SFTP connector runs on Microsoft's multi-tenant service, and Microsoft themselves confirm in their Q&A that **on-premises data gateway and Azure VNet NAT do not change the egress IP** — the SFTP connector still leaves through their shared pool regardless. So the usual "front the flow with a NAT gateway" fix unfortunately does not work for this specific connector.

There are three clean ways to give us a single static egress, in the order I would recommend them:

1. **Scheduled upload script on the same MobileMart server that already produces the Fulcrum recon file (our preferred option).** Drop Power Automate for this one flow. A PowerShell + WinSCP scheduled task (or bash + `lftp` on Linux) runs nightly on the server that generates `FULCRUM.MERCHANT.<NAME>.RECON.<DATETIME>.txt`, connects to our SFTP on port 5022 using your SSH key, and uploads the file. The egress IP is simply your corporate firewall's public address — one static /32. This is how most banks exchange SFTP recon files today. Zero Power Automate involvement, zero licence cost, easiest to audit, fewest moving parts.

2. **Power Automate Desktop flow on a server inside your network.** Same Power Automate tooling your team already knows, but installed as the Desktop (client-side) runtime on a server that sits in your network. Because the flow executes locally rather than in the cloud, its SFTP call egresses through your own firewall's public IP — again a single /32. Useful if your team prefers to keep the flow in Power Automate.

3. **HTTP relay hosted in your own VNet.** If the flow must stay in Power Automate cloud, it can HTTP POST the file to a small Azure Function (or Logic Apps Standard) that lives in a VNet you control, with a NAT gateway giving it a static outbound IP. The relay then does the SFTP to us. More moving parts, and it needs a bit of development on your side, but it does deliver a single /32.

Please let us know which of the three you'd like to go with, and then share the single static public IP you'll be using. Once I have that, the firewall rule and your SSH key go live on our side within the same business day and we can do a test-file upload end-to-end.

From our side everything else is already in place:

- SFTP endpoint: `34.35.137.166`, port `5022`, username `mobilemart`, key-only authentication
- Upload directory: `/home/mobilemart/`
- Parser built to your Fulcrum Recon Spec v1.1 (pipe-delimited, H/D/T structure, 24 body fields, amounts in cents)
- Automated reconciliation pipeline with matching, discrepancy detection, GCS archival and immutable audit trail

If none of the three options above works for your team for whatever reason, rather than us negotiating the firewall wider I would prefer to set up a quick call with Cobus and Mercia (both copied) so we can find a path together. I'm keen to get this across the finish line quickly — we've been ready on our side for some months and the sooner Fulcrum files start landing, the sooner we have full automated reconciliation on MobileMart volumes.

Kind regards,
André Botes
Founder & CEO, MyMoolah
andre@mymoolah.africa

---

## Internal decision log

- **62-IP service tag whitelist**: declined externally. No fallback offered. If MobileMart cannot deliver a /32, integration pauses and escalates via Cobus + Mercia.
- **Power Automate cloud SFTP connector**: verified via Microsoft Learn and Q&A that on-prem data gateway and VNet NAT do not change egress. Reference: [Managed connectors outbound IP addresses](https://learn.microsoft.com/en-us/connectors/common/outbound-ip-addresses) and [Microsoft Q&A thread](https://learn.microsoft.com/en-us/answers/questions/1465135/).
- **SSH key algorithm**: RSA 2048 is NIST-approved and acceptable. Not raised as a blocker; can be upgraded to RSA 4096 or Ed25519 in future without breaking the integration.
