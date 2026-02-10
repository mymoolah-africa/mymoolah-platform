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
const { Op } = require('sequelize');

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

    // Find users by first name and last name
    const findUser = async (firstName, lastName) => {
      const whereClause = {};
      if (firstName) {
        whereClause.firstName = {
          [Op.iLike]: `%${firstName}%`
        };
      }
      if (lastName) {
        whereClause.lastName = {
          [Op.iLike]: `%${lastName}%`
        };
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

    // Find users - adjust search terms based on actual names
    console.log('📋 Finding specific users...');
    
    // More flexible search
    const andre = await User.findOne({ where: { id: 1 }, transaction }); // Andre Botes
    const leonie = await User.findOne({ where: { id: 2 }, transaction }); // Leonie Botes
    const andreJr = await User.findOne({ where: { id: 4 }, transaction }); // Andre Jr Botes
    const hd = await User.findOne({ where: { id: 6 }, transaction }); // Hendrik Daniel Botes
    const neil = await User.findOne({ where: { id: 7 }, transaction }); // Neil Botes
    const denise = await User.findOne({ where: { id: 8 }, transaction }); // Denise Botes

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
      console.log('Please adjust the user IDs in the script to match your database.');
      
      await transaction.rollback();
      console.log('\n❌ Please check user IDs and try again.');
      process.exit(1);
    }

    console.log('\n✅ All users found!\n');

    // Clear existing referral data for these users
    console.log('🧹 Clearing existing referral data...');
    
    const userIds = Object.values(users).map(u => u.id);
    
    await ReferralChain.destroy({
      where: { userId: { [Op.in]: userIds } },
      transaction
    });
    
    await Referral.destroy({
      where: {
        [Op.or]: [
          { referrerUserId: { [Op.in]: userIds } },
          { refereeUserId: { [Op.in]: userIds } }
        ]
      },
      transaction
    });

    await UserReferralStats.destroy({
      where: { userId: { [Op.in]: userIds } },
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

    // Create referrals using correct field names
    // 1. Andre → Leonie
    await Referral.create({
      referrerUserId: andre.id,
      refereeUserId: leonie.id,
      referralCode: referralCodes.andre,
      refereePhoneNumber: leonie.phoneNumber,
      status: 'activated',
      invitedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      signedUpAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      activatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      invitationChannel: 'sms'
    }, { transaction });
    console.log('  ✅ Andre Botes → Leonie Botes');

    // 2. Leonie → Andre Jr
    await Referral.create({
      referrerUserId: leonie.id,
      refereeUserId: andreJr.id,
      referralCode: referralCodes.leonie,
      refereePhoneNumber: andreJr.phoneNumber,
      status: 'activated',
      invitedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      signedUpAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      activatedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
      invitationChannel: 'sms'
    }, { transaction });
    console.log('  ✅ Leonie Botes → Andre Jr Botes');

    // 3. Andre Jr → HD
    await Referral.create({
      referrerUserId: andreJr.id,
      refereeUserId: hd.id,
      referralCode: referralCodes.andreJr,
      refereePhoneNumber: hd.phoneNumber,
      status: 'activated',
      invitedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      signedUpAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      activatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      invitationChannel: 'sms'
    }, { transaction });
    console.log('  ✅ Andre Jr Botes → HD Botes');

    // 4. HD → Neil
    await Referral.create({
      referrerUserId: hd.id,
      refereeUserId: neil.id,
      referralCode: referralCodes.hd,
      refereePhoneNumber: neil.phoneNumber,
      status: 'activated',
      invitedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      signedUpAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      activatedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      invitationChannel: 'sms'
    }, { transaction });
    console.log('  ✅ HD Botes → Neil Botes');

    // 5. Neil → Denise
    await Referral.create({
      referrerUserId: neil.id,
      refereeUserId: denise.id,
      referralCode: referralCodes.neil,
      refereePhoneNumber: denise.phoneNumber,
      status: 'activated',
      invitedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      signedUpAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      activatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      invitationChannel: 'sms'
    }, { transaction });
    console.log('  ✅ Neil Botes → Denise Botes');

    console.log('\n🔗 Creating referral chains...\n');

    // Create referral chains for each user (3 levels only)
    // Andre has no chain (top of the pyramid)
    await ReferralChain.create({
      userId: andre.id,
      level1UserId: null,
      level2UserId: null,
      level3UserId: null,
      chainDepth: 0
    }, { transaction });
    console.log('  ✅ Andre (top level - no referrer)');

    // Leonie: L1=Andre
    await ReferralChain.create({
      userId: leonie.id,
      level1UserId: andre.id,
      level2UserId: null,
      level3UserId: null,
      chainDepth: 1
    }, { transaction });
    console.log('  ✅ Leonie: L1=Andre');

    // Andre Jr: L1=Leonie, L2=Andre
    await ReferralChain.create({
      userId: andreJr.id,
      level1UserId: leonie.id,
      level2UserId: andre.id,
      level3UserId: null,
      chainDepth: 2
    }, { transaction });
    console.log('  ✅ Andre Jr: L1=Leonie, L2=Andre');

    // HD: L1=Andre Jr, L2=Leonie, L3=Andre
    await ReferralChain.create({
      userId: hd.id,
      level1UserId: andreJr.id,
      level2UserId: leonie.id,
      level3UserId: andre.id,
      chainDepth: 3
    }, { transaction });
    console.log('  ✅ HD: L1=Andre Jr, L2=Leonie, L3=Andre');

    // Neil: L1=HD, L2=Andre Jr, L3=Leonie (3 levels, Andre drops off)
    await ReferralChain.create({
      userId: neil.id,
      level1UserId: hd.id,
      level2UserId: andreJr.id,
      level3UserId: leonie.id,
      chainDepth: 3
    }, { transaction });
    console.log('  ✅ Neil: L1=HD, L2=Andre Jr, L3=Leonie');

    // Denise: L1=Neil, L2=HD, L3=Andre Jr (3 levels, Andre drops off)
    await ReferralChain.create({
      userId: denise.id,
      level1UserId: neil.id,
      level2UserId: hd.id,
      level3UserId: andreJr.id,
      chainDepth: 3
    }, { transaction });
    console.log('  ✅ Denise: L1=Neil, L2=HD, L3=Andre Jr');

    console.log('\n📊 Creating user referral stats...\n');

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Create stats for each user (3 levels only)
    // Andre: 1 direct (Leonie), gets earnings from 3 levels
    await UserReferralStats.create({
      userId: andre.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 2,
      totalEarnedCents: 0,
      totalPaidCents: 0,
      pendingCents: 0,
      monthYear: currentMonth,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false
    }, { transaction });

    // Leonie: 1 direct (Andre Jr)
    await UserReferralStats.create({
      userId: leonie.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 1,
      totalEarnedCents: 0,
      totalPaidCents: 0,
      pendingCents: 0,
      monthYear: currentMonth,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false
    }, { transaction });

    // Andre Jr: 1 direct (HD)
    await UserReferralStats.create({
      userId: andreJr.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 1,
      totalEarnedCents: 0,
      totalPaidCents: 0,
      pendingCents: 0,
      monthYear: currentMonth,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false
    }, { transaction });

    // HD: 1 direct (Neil)
    await UserReferralStats.create({
      userId: hd.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 1,
      level3Count: 0,
      totalEarnedCents: 0,
      totalPaidCents: 0,
      pendingCents: 0,
      monthYear: currentMonth,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false
    }, { transaction });

    // Neil: 1 direct (Denise)
    await UserReferralStats.create({
      userId: neil.id,
      totalReferrals: 1,
      activeReferrals: 1,
      level1Count: 1,
      level2Count: 0,
      level3Count: 0,
      totalEarnedCents: 0,
      totalPaidCents: 0,
      pendingCents: 0,
      monthYear: currentMonth,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false
    }, { transaction });

    // Denise: 0 referrals (end of chain)
    await UserReferralStats.create({
      userId: denise.id,
      totalReferrals: 0,
      activeReferrals: 0,
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
      totalEarnedCents: 0,
      totalPaidCents: 0,
      pendingCents: 0,
      monthYear: currentMonth,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false
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
    console.log('                      └── Neil Botes (L1 of HD, L2 of Andre Jr, L3 of Leonie)');
    console.log('                            └── Denise Botes (L1 of Neil, L2 of HD, L3 of Andre Jr)');
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
