import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

async function syncVendorStatuses() {
  try {
    // Connect to MongoDB
    const mongoUri = config.mongoUri || process.env.MONGO_URI || config.mongodb?.uri;
    if (!mongoUri) {
      throw new Error('MongoDB connection string not found: set config.mongoUri or MONGO_URI env variable');
    }
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB');

    // Get all vendors
    const vendors = await Vendor.find({});
    logger.info(`Found ${vendors.length} vendors to process`);

    let updated = 0;
    let alreadySynced = 0;

    for (const vendor of vendors) {
      // Determine the correct status based on both fields
      let shouldUpdate = false;
      let newStatus = vendor.status;
      let newIsActive = vendor.isActive;

      // If status exists, use it as the source of truth
      if (vendor.status) {
        const expectedIsActive = vendor.status === 'active';
        if (vendor.isActive !== expectedIsActive) {
          newIsActive = expectedIsActive;
          shouldUpdate = true;
          logger.info(`Vendor "${vendor.name}": Syncing isActive=${newIsActive} to match status=${vendor.status}`);
        }
      } else {
        // If no status, set it based on isActive
        newStatus = vendor.isActive ? 'active' : 'inactive';
        shouldUpdate = true;
        logger.info(`Vendor "${vendor.name}": Setting status=${newStatus} based on isActive=${vendor.isActive}`);
      }

      if (shouldUpdate) {
        await Vendor.findByIdAndUpdate(vendor._id, { status: newStatus, isActive: newIsActive });
        updated++;
        logger.info(`✅ Updated vendor "${vendor.name}": status=${newStatus}, isActive=${newIsActive}`);
      } else {
        alreadySynced++;
      }
    }

    logger.info('=== Migration Complete ===');
    logger.info(`Total vendors: ${vendors.length}`);
    logger.info(`Updated: ${updated}`);
    logger.info(`Already synced: ${alreadySynced}`);

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
syncVendorStatuses()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
