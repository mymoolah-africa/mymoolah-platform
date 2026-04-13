# Reply to Razeen — SOF File Confirmed

**To**: Razeen@easypay.co.za  
**CC**: Malusi@easypay.co.za, Nkululeko@easypay.co.za  
**From**: andre@mymoolah.africa  
**Subject**: Re: MyMoola Receiver Integration

---

Hi Razeen,

Thank you for the SOF file sample and your public IP — much appreciated.

I can confirm:

1. **SOF format** — We have built our reconciliation parser to match your SOF file structure exactly:
   - File header: `SOF,version,receiverId,date,time,sequence`
   - Transaction groups: `X` (transaction header with terminal ID and EP transaction ref) → `P` (payment detail with gross amount, fee, and EasyPay code) → `T` (tender detail with tender amount, VAT, and tender type)
   - Footer line with totals (count, gross, fees, tender count, tender, VAT)
   - We will accept files named `easy[receiverId].[sequence]` (e.g., `easy2138.148`)

2. **Your IP whitelisted** — I will add `20.164.206.68` to our firewall rules for SFTP access on port 5022.

3. **SFTP connection details** (as sent previously):
   - Host: `34.35.137.166`
   - Port: `5022`
   - Username: `easypay`
   - Auth: SSH public key (no password)
   - Upload directory: `/home/easypay/`

To complete the SFTP setup, could you please share your SSH public key? Once we add it, you can start uploading SOF files and we will confirm end-to-end processing.

Also, regarding the V5 endpoint testing — please let us know when you are ready to start UAT testing against our receiver endpoints (the SessionToken and test PINs are ready to share).

Kind regards,  
Andre Botes  
Founder & CEO, MyMoolah  
andre@mymoolah.africa
