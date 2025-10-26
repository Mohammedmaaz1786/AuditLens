/**
 * Script to recalculate vendor totals (excluding rejected invoices)
 * Run this to fix vendor totals after adding rejected invoice exclusion
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audit-lens';

async function recalculateVendorTotals() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const vendorsCollection = db.collection('vendors');
    const invoicesCollection = db.collection('invoices');

    console.log('\n📊 Recalculating vendor totals (excluding rejected invoices)...\n');

    // Get all vendors
    const vendors = await vendorsCollection.find({}).toArray();
    console.log(`Found ${vendors.length} vendors`);

    let updatedCount = 0;

    for (const vendor of vendors) {
      // Calculate totals from non-rejected invoices only
      const invoiceStats = await invoicesCollection.aggregate([
        {
          $match: {
            vendorName: vendor.name,
            status: { $ne: 'rejected' }  // Exclude rejected invoices
          }
        },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]).toArray();

      const stats = invoiceStats[0] || { totalInvoices: 0, totalAmount: 0 };

      // Update vendor with correct totals
      await vendorsCollection.updateOne(
        { _id: vendor._id },
        {
          $set: {
            totalInvoices: stats.totalInvoices,
            totalAmount: stats.totalAmount
          }
        }
      );

      console.log(`✅ ${vendor.name}: ${stats.totalInvoices} invoices, $${stats.totalAmount.toFixed(2)} (was: ${vendor.totalInvoices} invoices, $${vendor.totalAmount.toFixed(2)})`);
      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} vendors`);
    console.log('✅ Vendor totals recalculated successfully!');

  } catch (error) {
    console.error('❌ Error recalculating vendor totals:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
recalculateVendorTotals();
