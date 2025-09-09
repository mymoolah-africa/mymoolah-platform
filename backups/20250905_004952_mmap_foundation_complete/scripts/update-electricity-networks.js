const { VasProduct } = require('../models');

/**
 * Update electricity networks in VAS products database
 * Based on Flash DS01 documentation - Annexure C: Electricity municipalities
 */

const FLASH_ELECTRICITY_PROVIDERS = [
  // Special Services
  { name: 'Free Basic Electricity', type: 'special', category: 'government_subsidy' },
  
  // National Utility
  { name: 'Eskom', type: 'national', category: 'utility' },
  
  // Metropolitan Municipalities
  { name: 'Ethekwini', type: 'metropolitan', category: 'municipality' },
  { name: 'City Power', type: 'metropolitan', category: 'municipality' },
  { name: 'Centlec (Mangaung)', type: 'metropolitan', category: 'municipality' },
  { name: 'City of Cape Town', type: 'metropolitan', category: 'municipality' },
  { name: 'Ekurhuleni', type: 'metropolitan', category: 'municipality' },
  
  // Local Municipalities
  { name: 'Albert Luthuli', type: 'local', category: 'municipality' },
  { name: 'BelaBela', type: 'local', category: 'municipality' },
  { name: 'Dikgatlong', type: 'local', category: 'municipality' },
  { name: 'Ditsobotla', type: 'local', category: 'municipality' },
  { name: 'Emakhazeni', type: 'local', category: 'municipality' },
  { name: 'Emalahleni (Witbank)', type: 'local', category: 'municipality' },
  { name: 'Ephraim Mogale (Marblehall)', type: 'local', category: 'municipality' },
  { name: 'GaSegonyana', type: 'local', category: 'municipality' },
  { name: 'Govan Mbeki', type: 'local', category: 'municipality' },
  { name: 'Greater Letaba', type: 'local', category: 'municipality' },
  { name: 'Kgatelopele', type: 'local', category: 'municipality' },
  { name: 'Kgethlengrivier', type: 'local', category: 'municipality' },
  { name: 'Kokstad', type: 'local', category: 'municipality' },
  { name: 'Langeberg', type: 'local', category: 'municipality' },
  { name: 'Lesedi', type: 'local', category: 'municipality' },
  { name: 'Lukhanji (Enoch Mugijima)', type: 'local', category: 'municipality' },
  { name: 'Madibeng', type: 'local', category: 'municipality' },
  { name: 'Mafube (water)', type: 'local', category: 'municipality' },
  { name: 'Magareng', type: 'local', category: 'municipality' },
  { name: 'Mandeni', type: 'local', category: 'municipality' },
  { name: 'Mantsopa', type: 'local', category: 'municipality' },
  { name: 'Matzikama', type: 'local', category: 'municipality' },
  { name: 'Maquassi Hills', type: 'local', category: 'municipality' },
  { name: 'Mbizana (Winnie Madikizela-Mandela)', type: 'local', category: 'municipality' },
  { name: 'Mpofana', type: 'local', category: 'municipality' },
  { name: 'Musina', type: 'local', category: 'municipality' },
  { name: 'Naledi', type: 'local', category: 'municipality' },
  { name: 'Phalaborwa', type: 'local', category: 'municipality' },
  { name: 'Siyathemba', type: 'local', category: 'municipality' },
  { name: 'Swellendam', type: 'local', category: 'municipality' },
  { name: 'Thaba Chweu', type: 'local', category: 'municipality' },
  { name: 'Thembelihle', type: 'local', category: 'municipality' },
  { name: 'Tsantsabane', type: 'local', category: 'municipality' },
  { name: 'Tswaing', type: 'local', category: 'municipality' },
  { name: 'Umsobomvu', type: 'local', category: 'municipality' },
  
  // District Municipalities
  { name: 'Uthukela District (Water)', type: 'district', category: 'municipality' },
  { name: 'Uthukela District (Electricity)', type: 'district', category: 'municipality' },
  
  // Private Utilities
  { name: 'Afhco', type: 'private', category: 'utility' },
  { name: 'Applied Metering Innovation', type: 'private', category: 'utility' },
  { name: 'Blueberry', type: 'private', category: 'utility' },
  { name: 'Broham', type: 'private', category: 'utility' },
  { name: 'BVTechSA', type: 'private', category: 'utility' },
  { name: 'Citiq', type: 'private', category: 'utility' },
  { name: 'Conlog SLICE – Mapule', type: 'private', category: 'utility' },
  { name: 'DA Metering', type: 'private', category: 'utility' },
  { name: 'EGS', type: 'private', category: 'utility' },
  { name: 'Energy Intelligence Consortium', type: 'private', category: 'utility' },
  { name: 'GRC Systems', type: 'private', category: 'utility' },
  { name: 'Hbros', type: 'private', category: 'utility' },
  { name: 'Ideal Prepaid', type: 'private', category: 'utility' },
  { name: 'IS Metering', type: 'private', category: 'utility' },
  { name: 'Itron PU', type: 'private', category: 'utility' },
  { name: 'JMflowsort', type: 'private', category: 'utility' },
  { name: 'Jager', type: 'private', category: 'utility' },
  { name: 'KK Prepaid', type: 'private', category: 'utility' },
  { name: 'Landis', type: 'private', category: 'utility' },
  { name: 'LIC', type: 'private', category: 'utility' },
  { name: 'LiveWire', type: 'private', category: 'utility' },
  { name: 'LL Energy', type: 'private', category: 'utility' },
  { name: 'Meter Man', type: 'private', category: 'utility' },
  { name: 'Meter Shack', type: 'private', category: 'utility' },
  { name: 'Metro Prepaid', type: 'private', category: 'utility' },
  { name: 'Mid-City', type: 'private', category: 'utility' },
  { name: 'MSI', type: 'private', category: 'utility' },
  { name: 'My Voltage', type: 'private', category: 'utility' },
  { name: 'NetVendor', type: 'private', category: 'utility' },
  { name: 'PEC Cape Town', type: 'private', category: 'utility' },
  { name: 'PEC Bloemfontein', type: 'private', category: 'utility' },
  { name: 'PEC Gauteng', type: 'private', category: 'utility' },
  { name: 'PMD (Power Measurement)', type: 'private', category: 'utility' },
  { name: 'Prepay Metering', type: 'private', category: 'utility' },
  { name: 'Protea Meter', type: 'private', category: 'utility' },
  { name: 'Ratcom (Mabcom Metering)', type: 'private', category: 'utility' },
  { name: 'Recharger', type: 'private', category: 'utility' },
  { name: 'Ruvick Energy', type: 'private', category: 'utility' },
  { name: 'Smart E Power', type: 'private', category: 'utility' },
  { name: 'Smartpowersa (Konta Metering)', type: 'private', category: 'utility' },
  { name: 'Unique Solutions', type: 'private', category: 'utility' },
  { name: 'UU Solutions', type: 'private', category: 'utility' },
  { name: 'Youtility_Actom', type: 'private', category: 'utility' },
  { name: 'Youtility_Inceku', type: 'private', category: 'utility' },
  { name: 'Youtility_Pioneer', type: 'private', category: 'utility' },
  { name: 'Youtility_Proadmin', type: 'private', category: 'utility' },
  { name: 'Youtility_Umfa', type: 'private', category: 'utility' },
  { name: 'Uvend', type: 'private', category: 'utility' },
  { name: 'Vula', type: 'private', category: 'utility' }
];

async function updateElectricityNetworks() {
  try {
    console.log('🔌 Updating electricity networks from Flash documentation...');
    
    // First, deactivate all existing electricity products
    await VasProduct.update(
      { isActive: false },
      { 
        where: { 
          vasType: 'electricity',
          supplierId: 'flash'
        }
      }
    );
    
    console.log('✅ Deactivated existing Flash electricity products');
    
    // Create new electricity products for each provider
    const electricityProducts = [];
    
    FLASH_ELECTRICITY_PROVIDERS.forEach((provider, index) => {
      // Create both prepaid and postpaid options for each provider
      ['Prepaid', 'Postpaid'].forEach((meterType) => {
        const productId = `flash_electricity_${provider.name.replace(/[^a-zA-Z0-9]/g, '_')}_${meterType.toLowerCase()}`;
        
        electricityProducts.push({
          supplierId: 'flash',
          supplierProductId: productId,
          productName: `${provider.name} ${meterType} Electricity`,
          vasType: 'electricity',
          transactionType: 'topup',
          provider: provider.name,
          networkType: 'local',
          predefinedAmounts: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000], // R10 to R2000
          minAmount: 1000, // R10 minimum
          maxAmount: 200000, // R2000 maximum (as per user requirement)
          commission: 0.85, // Flash electricity commission from DS01
          fixedFee: 0,
          isPromotional: false,
          isActive: true,
          priority: provider.type === 'special' ? 0 : 
                   provider.type === 'national' ? 1 : 
                   provider.type === 'metropolitan' ? 2 : 
                   provider.type === 'local' ? 3 : 4,
          metadata: {
            meterType: meterType,
            providerType: provider.type,
            providerCategory: provider.category,
            description: `${provider.name} ${meterType.toLowerCase()} electricity tokens`,
            flashProductCode: `ELEC_${provider.name.replace(/[^a-zA-Z0-9]/g, '_')}_${meterType.toUpperCase()}`,
            commissionType: 'percentage',
            settlementMode: 'prefunded'
          },
          lastUpdated: new Date()
        });
      });
    });
    
    // Create electricity products in batches to avoid PostgreSQL issues
    console.log('📦 Creating electricity products in batches...');
    
    for (const product of electricityProducts) {
      try {
        const [createdProduct, created] = await VasProduct.findOrCreate({
          where: {
            supplierId: product.supplierId,
            supplierProductId: product.supplierProductId
          },
          defaults: product
        });
        
        // If product already existed, update it to be active
        if (!created) {
          await createdProduct.update({
            isActive: true,
            productName: product.productName,
            predefinedAmounts: product.predefinedAmounts,
            minAmount: product.minAmount,
            maxAmount: product.maxAmount,
            commission: product.commission,
            priority: product.priority,
            metadata: product.metadata,
            lastUpdated: product.lastUpdated
          });
        }
      } catch (error) {
        console.warn(`⚠️ Warning: Could not create product ${product.supplierProductId}:`, error.message);
      }
    }
    
    console.log(`✅ Created/Updated ${electricityProducts.length} electricity products`);
    console.log(`📊 Breakdown:`);
    console.log(`   - National Utilities: ${FLASH_ELECTRICITY_PROVIDERS.filter(p => p.type === 'national').length}`);
    console.log(`   - Metropolitan Municipalities: ${FLASH_ELECTRICITY_PROVIDERS.filter(p => p.type === 'metropolitan').length}`);
    console.log(`   - Local Municipalities: ${FLASH_ELECTRICITY_PROVIDERS.filter(p => p.type === 'local').length}`);
    console.log(`   - District Municipalities: ${FLASH_ELECTRICITY_PROVIDERS.filter(p => p.type === 'district').length}`);
    console.log(`   - Private Utilities: ${FLASH_ELECTRICITY_PROVIDERS.filter(p => p.type === 'private').length}`);
    
    // Verify the update
    const activeElectricityProducts = await VasProduct.count({
      where: {
        vasType: 'electricity',
        supplierId: 'flash',
        isActive: true
      }
    });
    
    console.log(`✅ Total active Flash electricity products: ${activeElectricityProducts}`);
    
  } catch (error) {
    console.error('❌ Error updating electricity networks:', error);
    throw error;
  }
}

// Run the update if called directly
if (require.main === module) {
  updateElectricityNetworks()
    .then(() => {
      console.log('🎉 Electricity networks update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Electricity networks update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateElectricityNetworks, FLASH_ELECTRICITY_PROVIDERS };
