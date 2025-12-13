-- MobileMart Commission Tiers - Based on Annexure A (13-8-2024)
-- Add commission tiers for all MobileMart products per contract rates

-- Helper: Get MobileMart supplier ID
DO $$
DECLARE
  mobilemart_supplier_id INT;
BEGIN
  SELECT id INTO mobilemart_supplier_id FROM suppliers WHERE code = 'MOBILEMART';
  
  IF mobilemart_supplier_id IS NULL THEN
    RAISE EXCEPTION 'MobileMart supplier not found';
  END IF;

  -- Delete existing MobileMart commission tiers to avoid duplicates
  DELETE FROM supplier_commission_tiers WHERE "supplierId" = mobilemart_supplier_id;

  -- VOUCHERS (serviceType: 'voucher')
  -- Hollywood Bets: 5.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 5.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Hollywood Bets%';

  -- Netflix: 3.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 3.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Netflix%';

  -- PlayStation: 3.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 3.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'PlayStation%';

  -- Spotify: 4.5%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 4.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Spotify%';

  -- Google Play: 2.2%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 2.200, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Google%';

  -- iTunes: 3.5%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 3.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'iTunes%';

  -- PUBG: 5.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 5.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'PUBG%';

  -- Roblox: 4.5%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 4.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Roblox%';

  -- Steam: 2.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 2.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Steam%';

  -- Uber: 2.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 2.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Uber%';

  -- Lottostar: 4.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 4.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Lottostar%' OR p.name LIKE 'LottoStar%';

  -- OTT: 3.5%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 3.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'OTT%';

  -- Blu Voucher: 1.8%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 1.800, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Blu%';

  -- Razer Gold: 2.5%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 2.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Razer%';

  -- Free Fire: 2.5%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 2.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Free Fire%';

  -- Fifa Mobile: 3.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 3.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Fifa%';

  -- Showmax: 5.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 5.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Showmax%';

  -- Bok Squad: 10.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 10.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Bok Squad%';

  -- Sorbet: 4.0%
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 4.000, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Sorbet%';

  -- Takealot (default rate 2.5% if not in contract)
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'voucher', p.id, 0, NULL, 2.500, true, now(), now()
  FROM products p WHERE p."supplierId" = mobilemart_supplier_id AND p.name LIKE 'Takealot%';

  -- AIRTIME (serviceType: 'airtime')
  -- Default for all networks: 4.5% (MTN/Vodacom rate)
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'airtime', NULL, 0, NULL, 4.500, true, now(), now();

  -- DATA (serviceType: 'data')
  -- Default for all networks: 4.5% (MTN/Vodacom rate)
  INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "productId", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
  SELECT mobilemart_supplier_id, 'data', NULL, 0, NULL, 4.500, true, now(), now();

  RAISE NOTICE 'MobileMart commission tiers added successfully';
END$$;

