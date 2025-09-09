const { UserSettings } = require('./models');

async function initUserSettings() {
  try {
    console.log('🔄 Initializing UserSettings table...');
    
    // Sync the UserSettings model with the database
    await UserSettings.sync({ force: false });
    
    console.log('✅ UserSettings table initialized successfully!');
    console.log('📋 Available endpoints:');
    console.log('   - GET /api/v1/settings - Get user settings');
    console.log('   - PUT /api/v1/settings - Update user settings');
    console.log('   - PATCH /api/v1/settings/quick-access - Update quick access services');
    console.log('   - POST /api/v1/settings/reset - Reset to defaults');
    
  } catch (error) {
    console.error('❌ Error initializing UserSettings table:', error);
    process.exit(1);
  }
}

// Run the initialization
initUserSettings();
