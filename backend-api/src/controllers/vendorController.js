import Vendor from '../models/Vendor.js';
import Invoice from '../models/Invoice.js';
import logger from '../utils/logger.js';

export const getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'name', sortOrder = 'asc', riskLevel } = req.query;

    const query = {};
    if (search) {
      query.$or = [ { name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } } ];
    }
    if (riskLevel === 'high') query.riskScore = { $gte: 70 };
    else if (riskLevel === 'medium') query.riskScore = { $gte: 30, $lt: 70 };
    else if (riskLevel === 'low') query.riskScore = { $lt: 30 };

    const skip = (Number(page) - 1) * Number(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const vendors = await Vendor.find(query).sort(sort).skip(skip).limit(Number(limit)).populate('createdBy', 'firstName lastName email');
    const total = await Vendor.countDocuments(query);

    res.status(200).json({ success: true, data: { vendors, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
  } catch (error) {
    logger.error('Get vendors error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('createdBy', 'firstName lastName email');

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    const invoices = await Invoice.find({ vendor: vendor._id }).sort({ invoiceDate: -1 }).limit(10);

    res.status(200).json({ success: true, data: { vendor, recentInvoices: invoices } });
  } catch (error) {
    logger.error('Get vendor error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const createVendor = async (req, res) => {
  try {
    const vendorData = { ...req.body, createdBy: req.user?._id };
    const vendor = await Vendor.create(vendorData);

    logger.info(`Vendor created: ${vendor.name}`);

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    logger.error('Create vendor error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.status) {
      updateData.isActive = updateData.status === 'active';
      logger.info(`Syncing isActive=${updateData.isActive} with status=${updateData.status}`);
    }
    if (typeof updateData.isActive === 'boolean') {
      if (updateData.isActive && !updateData.status) updateData.status = 'active';
      else if (!updateData.isActive && !updateData.status) updateData.status = 'inactive';
    }

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    logger.info(`Vendor updated: ${vendor.name}, status: ${vendor.status}, isActive: ${vendor.isActive}`);

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    logger.error('Update vendor error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    const invoiceCount = await Invoice.countDocuments({ vendor: vendor._id });
    if (invoiceCount > 0) {
      res.status(400).json({ success: false, message: `Cannot delete vendor with ${invoiceCount} associated invoices` });
      return;
    }

    await vendor.deleteOne();

    logger.info(`Vendor deleted: ${vendor.name}`);

    res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    logger.error('Delete vendor error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getVendorStats = async (_req, res) => {
  try {
    const stats = await Vendor.aggregate([
      { $addFields: { effectiveStatus: { $cond: [ { $ifNull: ['$status', false] }, '$status', { $cond: [ { $eq: ['$isActive', true] }, 'active', 'inactive' ] } ] } } },
      { $group: { _id: null, totalVendors: { $sum: 1 }, activeVendors: { $sum: { $cond: [ { $eq: ['$effectiveStatus', 'active'] }, 1, 0 ] } }, inactiveVendors: { $sum: { $cond: [ { $eq: ['$effectiveStatus', 'inactive'] }, 1, 0 ] } }, blockedVendors: { $sum: { $cond: [ { $eq: ['$effectiveStatus', 'blocked'] }, 1, 0 ] } }, totalInvoices: { $sum: '$totalInvoices' }, totalAmount: { $sum: '$totalAmount' }, avgRiskScore: { $avg: '$riskScore' }, highRiskVendors: { $sum: { $cond: [ { $gte: ['$riskScore', 70] }, 1, 0 ] } } } }
    ]);

    const topVendors = await Vendor.find().sort({ totalAmount: -1 }).limit(10).select('name totalInvoices totalAmount riskScore status isActive');

    const highRiskVendors = await Vendor.find({ riskScore: { $gte: 70 } }).sort({ riskScore: -1 }).limit(10).select('name totalInvoices totalAmount riskScore status isActive');

    res.status(200).json({ success: true, data: { overview: stats[0] || { totalVendors: 0, activeVendors: 0, inactiveVendors: 0, blockedVendors: 0, totalInvoices: 0, totalAmount: 0, avgRiskScore: 0, highRiskVendors: 0 }, topVendors, highRiskVendors } });
  } catch (error) {
    logger.error('Get vendor stats error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};