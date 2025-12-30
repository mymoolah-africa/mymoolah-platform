/**
 * Seed Test Referrals Data for UAT
 * 
 * Chain:
 * Andre Botes → Leonie Botes
 * Leonie Botes → Andre Jr Botes
 * Andre Jr Botes → Hendrik Daniël (HD) Botes
 * Hendrik Daniël (HD) Botes → Neil Botes
 * Neil Botes → Denise Botes
 */

require('dotenv').config();

const { User, Referral, ReferralChain, UserReferralStats, sequelize } = require('../models');
const crypto = require('crypto');

// Generate a unique referral code
function generateReferralCode(name) {
  const prefix = name.split(' ')[0].toUpperCase().slice(0, 4);
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${suffix}`;
}

async function seedTestReferrals() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n🌱 Seeding Test Referral Data...\n');

    // Find users by first name and last name (partial match)
    const findUser = async (firstName, lastName) => {
      const whereClause = {};
      if (firstName) {
        whereClause.firstName = sequelize.where(
          sequelize.fn('LOWER', sequelize.col('firstName')),
          'LIKE',
          `%${firstName.toLowerCase()}%`
        );
      }
      if (lastName) {
        whereClause.lastName = sequelize.where(
          sequelize.fn('LOWER', sequelize.col('lastName')),
          'LIKE',
          `%${lastName.toLowerCase()}%`
        );
      }
      const user = await User.findOne({
        where: whereClause,
        transaction
      });
      return user;
    };

    // First, list all users to see what's available
    console.log('📋 Listing all users in database...\n');
    const allUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'phoneNumber'],
      order: [['firstName', 'ASC']],
      transaction
    });
    
    allUsers.forEach(u => {
      console.log(`  ID ${u.id}: ${u.firstName} ${u.lastName} (${u.phoneNumber})`);
    });
    console.log('');

    // Find users
    console.log('📋 Finding specific users...');
    
    const andre = await findUser('Andre', 'Botes');
    const leonie = await findUser('Leonie', 'Botes');
    const andreJr = await findUser('Andre Jr', 'Botes') || await findUser('Andre', 'Jr');
    const hd = await findUser('Hendrik', 'Botes') || await findUser('HD', 'Botes');
    const neil = await findUser('Neil', 'Botes');
    const denise = await findUser('Denise', 'Botes');

    // Helper to get full name
    const getFullName = (user) => user ? `${user.firstName} ${user.lastName}` : null;

    // Log found users
    console.log('  Andre Botes:', andre ? `ID ${andre.id} (${getFullName(andre)})` : '❌ NOT FOUND');
    console.log('  Leonie Botes:', leonie ? `ID ${leonie.id} (${getFullName(leonie)})` : '❌ NOT FOUND');
    console.log('  Andre Jr Botes:', andreJr ? `ID ${andreJr.id} (${getFullName(andreJr)})` : '❌ NOT FOUND');
    console.log('  HD Botes:', hd ? `ID ${hd.id} (${getFullName(hd)})` : '❌ NOT FOUND');
    console.log('  Neil Botes:', neil ? `ID ${neil.id} (${getFullName(neil)})` : '❌ NOT FOUND');
    console.log('  Denise Botes:', denise ? `ID ${denise.id} (${getFullName(denise)})` : '❌ NOT FOUND');

    // Check if all users exist
    const users = { andre, leonie, andreJr, hd, neil, denise };
    const missingUsers = Object.entries(users)
      .filter(([, user]) => !user)
      .map(([name]) => name);

    if (missingUsers.length > 0) {
      console.log('\n⚠️  Some users not found: ' + missingUsers.join(', '));
      console.log('Please create these users first or adjust the search criteria.');
      
      await transaction.rollback();
      console.log('\n❌ Please check user names and try again.');
      process.exit(1);
    }

    console.log('\n✅ All users found!\n');

    // Clear existing referral data for these users
    console.log('🧹 Clearing existing referral data...');
    
    const userIds = Object.values(users).map(u => u.id);
    
    await ReferralChain.destroy({
      where: { userId: userIds },
      transaction
    });
    
    await Referral.destroy({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { referrerId: userIds },
          { referredId: userIds }
        ]
      },
      transaction
    });

    await UserReferralStats.destroy({
      where: { userId: userIds },
      transaction
    });

    console.log('✅ Existing data cleared\n');

    // Create referral codes for each user
    console.log('🔑 Creating referral codes...');
    
    const referralCodes = {
      andre: generateReferralCode('Andre'),
      leonie: generateReferralCode('Leonie'),
      andreJr: generateReferralCode('AndreJr'),
      hd: generateReferralCode('HD'),
      neil: generateReferralCode('Neil'),
      denise: generateReferralCode('Denise')
    };

    // Update users with referral codes
    for (const [key, user] of Object.entries(users)) {
      await user.update({ referralCode: referralCodes[key] }, { transaction });
      console.log(`  ${user.firstName} ${user.lastName}: ${referralCodes[key]}`);
    }

    console.log('\n📝 Creating referral relationships...\n');

    // Create referrals
    // 1. Andre → Leonie
    await Referral.create({
      referrerId: andre.id,
      referredId: leonie.id,
      referralCode: referralCodes.andre,
      status: 'active',
      activatedAt: new Date()
    }, { transaction });
    console.log('  ✅ Andre Botes → Leonie Botes');

    // 2. Leonie → Andre Jr
    await Referral.create({
      referrerId: leonie.id,
      referredId: andreJr.id,
      referralCode: referralCodes.leonie,
      status: 'active',
      activatedAt: new Date()
    }, { transaction });
    console.log('  ✅ Leonie Botes → Andre Jr Botes');

    // 3. Andre Jr → HD
    await Referral.create({
      referrerId: andreJr.id,
      referredId: hd.id,
      referralCode: referralCodes.andreJr,
      status: 'active',
      activatedAt: new Date()
    }, { transaction });
    console.log('  ✅ Andre Jr Botes → HD Botes');

    // 4. HD → Neil
    await Referral.create({
      referrerId: hd.id,
      referredId: neil.id,
      referralCode: referralCodes.hd,
      status: 'active',
      activatedAt: new Date()
    }, { transaction });
    console.log('  ✅ HD Botes → Neil Botes');

    // 5. Neil → Denise
    await Referral.create({
      referrerId: neil.id,
      referredId: denise.id,
      referralCode: referralCodes.neil,
      status: 'active',
      activatedAt: new Date()
    }, { transaction });
    console.log('  ✅ Neil Botes → Denise Botes');

    console.log('\n🔗 Creating referral chains...\n');

    // Create referral chains for each user
    // Andre has no chain (top of the pyramid)
    await ReferralChain.create({
      userId: andre.id,
      level1ReferrerId: null,
      level2ReferrerId: null,
      level3ReferrerId: null,
      level4ReferrerId: null
    }, { transaction });
    console.log('  ✅ Andre (top level - no referrer)');

    // Leonie: L1=Andre
    await ReferralChain.create({
      userId: leonie.id,
      level1ReferrerId: andre.id,
      level2ReferrerId: null,
      level3ReferrerId: null,
      level4ReferrerId: null
    }, { transaction });
    console.log('  ✅ Leonie: L1=Andre');

    // Andre Jr: L1=Leonie, L2=Andre
    await ReferralChain.create({
      userId: andreJr.id,
      level1ReferrerId: leonie.id,
      level2ReferrerId: andre.id,
      level3ReferrerId: null,
      level4ReferrerId: null
    }, { transaction });
    console.log('  ✅ Andre Jr: L1=Leonie, L2=Andre');

    // HD: L1=Andre Jr, L2=Leonie, L3=Andre
    await ReferralChain.create({
      userId: hd.id,
      level1ReferrerId: andreJr.id,
      level2ReferrerId: leonie.id,
      level3ReferrerId: andre.id,
      level4ReferrerId: null
    }, { transaction });
    console.log('  ✅ HD: L1=Andre Jr, L2=Leonie, L3=Andre');

    // Neil: L1=HD, L2=Andre Jr, L3=Leonie, L4=Andre
    await ReferralChain.create({
      userId: neil.id,
      level1ReferrerId: hd.id,
      level2ReferrerId: andreJr.id,
      level3ReferrerId: leonie.id,
      level4ReferrerId: andre.id
    }, { transaction });
    console.log('  ✅ Neil: L1=HD, L2=Andre Jr, L3=Leonie, L4=Andre');

    // Denise: L1=Neil, L2=HD, L3=Andre Jr, L4=Leonie (Andre drops off - beyond 4 levels)
    await ReferralChain.create({
      userId: denise.id,
      level1ReferrerId: neil.id,
      level2ReferrerId: hd.id,
      level3ReferrerId: andreJr.id,
      level4ReferrerId: leonie.id
    }, { transaction });
    console.log('  ✅ Denise: L1=Neil, L2=HD, L3=Andre Jr, L4=Leonie');

    console.log('\n📊 Creating user referral stats...\n');

    // Create stats for each user
    // Andre: 1 direct (Leonie), gets earnings from 4 levels
    await UserReferralStats.create({
      userId: andre.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 2,
      level4Count: 1,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }, { transaction });

    // Leonie: 1 direct (Andre Jr)
    await UserReferralStats.create({
      userId: leonie.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 1,
      level4Count: 1,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }, { transaction });

    // Andre Jr: 1 direct (HD)
    await UserReferralStats.create({
      userId: andreJr.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 1,
      level4Count: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }, { transaction });

    // HD: 1 direct (Neil)
    await UserReferralStats.create({
      userId: hd.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 0,
      level4Count: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }, { transaction });

    // Neil: 1 direct (Denise)
    await UserReferralStats.create({
      userId: neil.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 0,
      level3Count: 0,
      level4Count: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }, { transaction });

    // Denise: 0 referrals (end of chain)
    await UserReferralStats.create({
      userId: denise.id,
      totalReferrals: 0,
      activeReferrals: 0,
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
      level4Count: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }, { transaction });

    console.log('✅ Stats created for all users');

    await transaction.commit();

    console.log('\n' + '═'.repeat(50));
    console.log('🎉 TEST REFERRAL DATA SEEDED SUCCESSFULLY!');
    console.log('═'.repeat(50));
    console.log('\n📋 Referral Chain Summary:');
    console.log('');
    console.log('  Andre Botes (TOP)');
    console.log('    └── Leonie Botes (L1 of Andre)');
    console.log('          └── Andre Jr Botes (L1 of Leonie, L2 of Andre)');
    console.log('                └── HD Botes (L1 of Andre Jr, L2 of Leonie, L3 of Andre)');
    console.log('                      └── Neil Botes (L1 of HD, L2 of Andre Jr, L3 of Leonie, L4 of Andre)');
    console.log('                            └── Denise Botes (L1 of Neil, L2 of HD, L3 of Andre Jr, L4 of Leonie)');
    console.log('');
    console.log('💡 Now when any user makes a transaction, their referral chain will earn commissions!');
    console.log('');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error seeding referral data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedTestReferrals();

