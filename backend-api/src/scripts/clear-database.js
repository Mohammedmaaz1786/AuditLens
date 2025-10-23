import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auditlens';

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 Found ${collections.length} collections to clear:`);

    for (const collection of collections) {
      console.log(`   - ${collection.name}`);
    }

    console.log('\n🗑️  Clearing all collections...\n');

    // Drop each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      try {
        await db.collection(collectionName).deleteMany({});
        const count = await db.collection(collectionName).countDocuments();
        console.log(`✅ Cleared ${collectionName} (${count} documents remaining)`);
      } catch (error) {
        console.error(`❌ Error clearing ${collectionName}:`, error);
      }
    }

    console.log('\n✨ Database cleared successfully!');
    console.log('📊 Summary:');

    // Verify all collections are empty
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

// Run the script
clearDatabase();
