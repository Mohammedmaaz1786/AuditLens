import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Invoice from '../models/Invoice.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

const seedDatabase = async () => {
  try {
    // SEED SCRIPT DISABLED - User requested no mock data
    logger.warn('⚠️  Seed script is disabled. No mock data will be created.');
    logger.info('Database is ready for real invoice uploads only.');
    logger.info('To re-enable seeding, remove the return statement in seed.js');
    return;

    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await Invoice.deleteMany({});
    logger.info('Cleared existing data');

    // Create users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const adminUser = await User.create({ email: 'admin@auditlens.com', password: hashedPassword, firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true });

    const auditorUser = await User.create({ email: 'auditor@auditlens.com', password: hashedPassword, firstName: 'Auditor', lastName: 'User', role: 'auditor', isActive: true });

    logger.info('✅ Created users (password: password123)');
    logger.info(`   Admin: admin@auditlens.com`);
    logger.info(`   Auditor: auditor@auditlens.com`);

    // Create vendors
    const vendors = await Vendor.create([
      { name: 'Innovate LLC', email: 'contact@innovate.com', phone: '+1-555-0101', address: '123 Tech Street, San Francisco, CA 94105', taxId: 'TAX-123456', category: 'Technology', riskScore: 10, isActive: true, createdBy: adminUser._id },
      { name: 'Solutions Inc', email: 'info@solutions.com', phone: '+1-555-0102', address: '456 Business Ave, New York, NY 10001', taxId: 'TAX-789012', category: 'Consulting', riskScore: 30, isActive: true, createdBy: adminUser._id },
      { name: 'Data Systems', email: 'support@datasystems.com', phone: '+1-555-0103', address: '789 Data Lane, Austin, TX 78701', taxId: 'TAX-345678', category: 'IT Services', riskScore: 20, isActive: true, createdBy: adminUser._id },
      { name: 'Matrix Solutions', email: 'contact@matrix.com', phone: '+1-555-0104', address: '321 Risk Road, Chicago, IL 60601', taxId: 'TAX-901234', category: 'Consulting', riskScore: 92, isActive: false, notes: 'High risk vendor - under review', createdBy: adminUser._id },
    ]);

    logger.info(`✅ Created ${vendors.length} vendors`);

    // Create invoices (omitted for brevity in disabled seed)

    logger.info('\n🎉 Database seeded successfully!');
    await mongoose.connection.close();
    logger.info('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
