const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

// Database connection
const sequelize = new Sequelize(config.development);

async function migrateToUnifiedBeneficiaries() {
  try {
    console.log('🔄 Starting migration to unified beneficiary system...');
    
    // Get all existing beneficiaries
    const [beneficiaries] = await sequelize.query(`
      SELECT * FROM beneficiaries 
      ORDER BY "userId", "accountType", "createdAt"
    `);
    
    console.log(`📊 Found ${beneficiaries.length} beneficiaries to migrate`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const beneficiary of beneficiaries) {
      try {
        // Convert existing beneficiary to new unified structure
        const updatedData = convertToUnifiedStructure(beneficiary);
        
        // Update the beneficiary record
        await sequelize.query(`
          UPDATE beneficiaries 
          SET 
            "paymentMethods" = :paymentMethods,
            "vasServices" = :vasServices,
            "utilityServices" = :utilityServices,
            "billerServices" = :billerServices,
            "voucherServices" = :voucherServices,
            "preferredPaymentMethod" = :preferredPaymentMethod,
            "isFavorite" = :isFavorite,
            "notes" = :notes,
            "updatedAt" = NOW()
          WHERE id = :id
        `, {
          replacements: {
            id: beneficiary.id,
            paymentMethods: JSON.stringify(updatedData.paymentMethods),
            vasServices: JSON.stringify(updatedData.vasServices),
            utilityServices: JSON.stringify(updatedData.utilityServices),
            billerServices: JSON.stringify(updatedData.billerServices),
            voucherServices: JSON.stringify(updatedData.voucherServices),
            preferredPaymentMethod: updatedData.preferredPaymentMethod,
            isFavorite: updatedData.isFavorite,
            notes: updatedData.notes
          }
        });
        
        updatedCount++;
        console.log(`✅ Migrated: ${beneficiary.name} (${beneficiary.accountType})`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${beneficiary.name}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${updatedCount} beneficiaries`);
    console.log(`❌ Skipped: ${skippedCount} beneficiaries`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

function convertToUnifiedStructure(beneficiary) {
  const base = {
    paymentMethods: null,
    vasServices: null,
    utilityServices: null,
    billerServices: null,
    voucherServices: null,
    preferredPaymentMethod: beneficiary.accountType,
    isFavorite: false,
    notes: null
  };
  
  // Convert based on account type
  switch (beneficiary.accountType) {
    case 'mymoolah':
      base.paymentMethods = {
        mymoolah: {
          walletId: beneficiary.identifier,
          isActive: true
        }
      };
      break;
      
    case 'bank':
      base.paymentMethods = {
        bankAccounts: [{
          id: `bank_${beneficiary.id}`,
          accountNumber: beneficiary.identifier,
          bankName: beneficiary.bankName || 'Unknown Bank',
          accountType: 'current',
          isActive: true
        }]
      };
      break;
      
    case 'airtime':
    case 'data':
      base.vasServices = {
        [beneficiary.accountType]: [{
          id: `vas_${beneficiary.id}`,
          mobileNumber: beneficiary.identifier,
          network: beneficiary.metadata?.network || 'Unknown',
          isActive: true
        }]
      };
      break;
      
    case 'electricity':
      base.utilityServices = {
        electricity: [{
          id: `utility_${beneficiary.id}`,
          meterNumber: beneficiary.identifier,
          meterType: beneficiary.metadata?.meterType || 'prepaid',
          provider: beneficiary.metadata?.provider || 'Unknown',
          isActive: true
        }]
      };
      break;
      
    case 'biller':
      base.billerServices = {
        accounts: [{
          id: `biller_${beneficiary.id}`,
          accountNumber: beneficiary.identifier,
          billerName: beneficiary.metadata?.billerName || 'Unknown Biller',
          billerCategory: beneficiary.metadata?.billerCategory || 'general',
          isActive: true
        }]
      };
      break;
      
    default:
      console.log(`⚠️ Unknown account type: ${beneficiary.accountType}`);
  }
  
  return base;
}

// Run migration if called directly
if (require.main === module) {
  migrateToUnifiedBeneficiaries()
    .then(() => {
      console.log('🚀 Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToUnifiedBeneficiaries, convertToUnifiedStructure };
