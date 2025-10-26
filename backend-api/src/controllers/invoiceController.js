import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export const processInvoice = async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please upload a file' });
      return;
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const ocrResponse = await axios.post(`${config.ocrService.url}/api/process-invoice`, formData, {
      headers: formData.getHeaders(),
      timeout: config.ocrService.timeout,
    });

    const ocrData = ocrResponse.data;

    if (!ocrData.success || !ocrData.data) {
      res.status(400).json({ success: false, message: 'OCR processing failed', error: ocrData.error || 'No data extracted' });
      return;
    }

    const extractedData = ocrData.data;

    if (!extractedData.vendor_name || !extractedData.invoice_number || !extractedData.total_amount) {
      res.status(400).json({ success: false, message: 'Incomplete invoice data extracted. Missing vendor name, invoice number, or total amount.' });
      return;
    }

    let vendor = await Vendor.findOne({ name: extractedData.vendor_name });

    if (!vendor) {
      vendor = await Vendor.create({
        name: extractedData.vendor_name,
        email: extractedData.vendor_email,
        phone: extractedData.vendor_phone,
        address: extractedData.vendor_address,
        createdBy: req.user?._id,
      });
      logger.info(`New vendor created: ${vendor.name}`);
    } else {
      const vendorStatus = vendor.status || (vendor.isActive ? 'active' : 'inactive');

      logger.info(`Vendor found: ${vendor.name}, status field: ${vendor.status}, isActive field: ${vendor.isActive}, effective status: ${vendorStatus}`);

      if (vendorStatus === 'blocked') {
        logger.warn(`REJECTED: Invoice from BLOCKED vendor "${vendor.name}"`);
        res.status(403).json({ success: false, message: `Cannot process invoice. Vendor "${vendor.name}" is BLOCKED.`, vendorStatus: 'blocked' });
        return;
      }

      if (vendorStatus === 'inactive') {
        logger.warn(`REJECTED: Invoice from INACTIVE vendor "${vendor.name}"`);
        res.status(403).json({ success: false, message: `Cannot process invoice. Vendor "${vendor.name}" is INACTIVE. Please activate the vendor first.`, vendorStatus: 'inactive' });
        return;
      }

      logger.info(`✅ Vendor "${vendor.name}" is active, proceeding with invoice processing`);
    }

    let processedFraudAnalysis = undefined;
    if (extractedData.fraud_analysis) {
      try {
        const fraudData = extractedData.fraud_analysis;

        let warnings = [];
        if (fraudData.warnings) {
          if (typeof fraudData.warnings === 'string') {
            try {
              warnings = JSON.parse(fraudData.warnings);
            } catch (e) {
              warnings = [fraudData.warnings];
            }
          } else if (Array.isArray(fraudData.warnings)) {
            warnings = fraudData.warnings.map((w) => {
              if (typeof w === 'object' && w.description) {
                return w.description;
              }
              return String(w);
            });
          }
        }

        let detections = [];
        if (fraudData.detections && Array.isArray(fraudData.detections)) {
          detections = fraudData.detections.map((d) => ({
            type: d.type || 'UNKNOWN',
            severity: d.severity || 'LOW',
            score: d.score || 0,
            details: d.details || d.description || '',
          }));
        }

        let overallScore = fraudData.overallScore || fraudData.overall_score || 0;
        if (!overallScore && detections.length > 0) {
          overallScore = detections.reduce((sum, d) => sum + d.score, 0) / detections.length;
        }

        let riskLevel = fraudData.riskLevel || fraudData.risk_level;
        if (!riskLevel) {
          if (overallScore >= 75) riskLevel = 'CRITICAL';
          else if (overallScore >= 50) riskLevel = 'HIGH';
          else if (overallScore >= 25) riskLevel = 'MEDIUM';
          else riskLevel = 'LOW';
        }

        processedFraudAnalysis = { riskLevel, overallScore, detections, warnings, timestamp: fraudData.timestamp || new Date() };
      } catch (error) {
        logger.error('Error processing fraud analysis:', error);
        processedFraudAnalysis = { riskLevel: 'LOW', overallScore: 0, detections: [], warnings: [], timestamp: new Date() };
      }
    }

    const invoice = await Invoice.create({
      invoiceNumber: extractedData.invoice_number,
      vendor: vendor._id,
      vendorName: extractedData.vendor_name,
      vendorEmail: extractedData.vendor_email,
      vendorPhone: extractedData.vendor_phone,
      vendorAddress: extractedData.vendor_address,
      billToName: extractedData.bill_to_name,
      billToAddress: extractedData.bill_to_address,
      billToEmail: extractedData.bill_to_email,
      billToPhone: extractedData.bill_to_phone,
      billToCompany: extractedData.bill_to_company,
      customerName: extractedData.customer_name,
      customerAddress: extractedData.customer_address,
      customerEmail: extractedData.customer_email,
      customerPhone: extractedData.customer_phone,
      shipToName: extractedData.ship_to_name,
      shipToAddress: extractedData.ship_to_address,
      invoiceDate: new Date(extractedData.invoice_date),
      dueDate: extractedData.due_date ? new Date(extractedData.due_date) : undefined,
      totalAmount: extractedData.total_amount,
      taxAmount: extractedData.tax_amount,
      subtotal: extractedData.subtotal,
      currency: extractedData.currency || 'USD',
      lineItems: Array.isArray(extractedData.line_items) ? extractedData.line_items : [],
      notes: extractedData.notes,
      paymentTerms: extractedData.payment_terms,
      poNumber: extractedData.po_number,
      ocrConfidence: ocrData.confidence,
      ocrRawText: extractedData.raw_text,
      originalFileName: req.file.originalname,
      fileUrl: req.file.path,
      fraudAnalysis: processedFraudAnalysis,
      uploadedBy: req.user?._id,
      status: 'pending',
    });

    // Only update vendor totals if invoice is not rejected
    if (invoice.status !== 'rejected') {
      vendor.totalInvoices += 1;
      vendor.totalAmount += extractedData.total_amount;
    }
    if (processedFraudAnalysis) {
      vendor.riskScore = processedFraudAnalysis.overallScore;
    }
    await vendor.save();

    logger.info(`Invoice processed and saved: ${invoice.invoiceNumber}`);

    res.status(201).json({ success: true, data: { invoice, vendor, ocrConfidence: ocrData.confidence } });
  } catch (error) {
    logger.error('Process invoice error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ success: false, message: error.message || 'Server error processing invoice' });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      vendorName,
      vendorEmail,
      totalAmount,
      taxAmount,
      subtotal,
      invoiceDate,
      dueDate,
      currency,
      lineItems,
      ocrConfidence,
      rawText,
      status,
      fraudAnalysis,
    } = req.body;

    if (!invoiceNumber || !vendorName || !totalAmount) {
      res.status(400).json({ success: false, message: 'Invoice number, vendor name, and total amount are required' });
      return;
    }

    let vendor = await Vendor.findOne({ name: { $regex: new RegExp(`^${vendorName}$`, 'i') } });

    if (!vendor) {
      vendor = await Vendor.create({
        name: vendorName,
        email: vendorEmail || undefined,
        riskScore: fraudAnalysis?.overallScore || 50,
        totalInvoices: 0,
        totalAmount: 0,
        isActive: true,
        createdBy: req.user?.id,
      });
    }

    let processedFraudAnalysis = undefined;
    if (fraudAnalysis) {
      try {
        let warnings = [];
        if (fraudAnalysis.warnings) {
          if (typeof fraudAnalysis.warnings === 'string') {
            try {
              warnings = JSON.parse(fraudAnalysis.warnings);
            } catch (e) {
              warnings = [fraudAnalysis.warnings];
            }
          } else if (Array.isArray(fraudAnalysis.warnings)) {
            warnings = fraudAnalysis.warnings.map((w) => {
              if (typeof w === 'object' && w.description) {
                return w.description;
              }
              return String(w);
            });
          }
        }

        let detections = [];
        if (fraudAnalysis.detections && Array.isArray(fraudAnalysis.detections)) {
          detections = fraudAnalysis.detections.map((d) => ({
            type: d.type || 'UNKNOWN',
            severity: d.severity || 'LOW',
            score: d.score || 0,
            details: d.details || d.description || '',
          }));
        }

        let overallScore = fraudAnalysis.overallScore || fraudAnalysis.overall_score || 0;
        if (!overallScore && detections.length > 0) {
          overallScore = detections.reduce((sum, d) => sum + d.score, 0) / detections.length;
        }

        let riskLevel = fraudAnalysis.riskLevel || fraudAnalysis.risk_level;
        if (!riskLevel) {
          if (overallScore >= 75) riskLevel = 'CRITICAL';
          else if (overallScore >= 50) riskLevel = 'HIGH';
          else if (overallScore >= 25) riskLevel = 'MEDIUM';
          else riskLevel = 'LOW';
        }

        processedFraudAnalysis = { riskLevel, overallScore, detections, warnings, timestamp: fraudAnalysis.timestamp || new Date() };
      } catch (error) {
        logger.error('Error processing fraud analysis in createInvoice:', error);
      }
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      vendor: vendor._id,
      vendorName,
      vendorEmail: vendorEmail || vendor.email,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalAmount: Number(totalAmount),
      taxAmount: taxAmount ? Number(taxAmount) : undefined,
      subtotal: subtotal ? Number(subtotal) : undefined,
      currency: currency || 'USD',
      status: status || 'pending',
      lineItems: Array.isArray(lineItems) ? lineItems : [],
      ocrConfidence: ocrConfidence || 0,
      ocrRawText: rawText,
      fraudAnalysis: processedFraudAnalysis,
      uploadedBy: req.user?.id,
    });

    // Only update vendor totals if invoice is not rejected
    if (invoice.status !== 'rejected') {
      vendor.totalInvoices += 1;
      vendor.totalAmount += invoice.totalAmount;
    }
    if (processedFraudAnalysis?.overallScore) {
      vendor.riskScore = processedFraudAnalysis.overallScore;
    }
    await vendor.save();

    res.status(201).json({ success: true, data: invoice, message: 'Invoice created successfully' });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating invoice' });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      vendor,
      riskLevel,
      startDate,
      endDate,
      sortBy = 'invoiceDate',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (status) query.status = status;

    if (vendor) {
      if (mongoose.Types.ObjectId.isValid(vendor)) query.vendor = vendor;
      else query.vendorName = { $regex: vendor, $options: 'i' };
    }

    if (riskLevel) query['fraudAnalysis.riskLevel'] = riskLevel;
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const invoices = await Invoice.find(query)
      .populate('vendor', 'name email phone')
      .populate('uploadedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Invoice.countDocuments(query);

    res.status(200).json({ success: true, data: { invoices, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('vendor').populate('uploadedBy', 'firstName lastName email').populate('approvedBy', 'firstName lastName email');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    logger.info(`Invoice updated: ${invoice.invoiceNumber}`);

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    if (invoice.fileUrl && fs.existsSync(invoice.fileUrl)) {
      fs.unlinkSync(invoice.fileUrl);
    }

    await invoice.deleteOne();

    logger.info(`Invoice deleted: ${invoice.invoiceNumber}`);

    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    logger.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const approveInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user?._id, approvedAt: new Date() }, { new: true });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    logger.info(`Invoice approved: ${invoice.invoiceNumber} by ${req.user?.email}`);

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Approve invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const rejectInvoice = async (req, res) => {
  try {
    const { reason } = req.body;

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectedBy: req.user?._id, rejectionReason: reason || 'Rejected by user' }, { new: true });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    logger.info(`Invoice rejected: ${invoice.invoiceNumber} by ${req.user?.email}`);

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    logger.error('Reject invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getInvoiceStats = async (_req, res) => {
  try {
    // Exclude rejected invoices from overall stats
    const stats = await Invoice.aggregate([
      {
        $match: { status: { $ne: 'rejected' } }
      },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' },
          pendingInvoices: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approvedInvoices: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          highRiskInvoices: { $sum: { $cond: [{ $in: ['$fraudAnalysis.riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0] } },
        },
      },
    ]);

    const statusBreakdown = await Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    const riskBreakdown = await Invoice.aggregate([{ $group: { _id: '$fraudAnalysis.riskLevel', count: { $sum: 1 } } }]);

    res.status(200).json({ success: true, data: { overview: stats[0] || { totalInvoices: 0, totalAmount: 0, avgAmount: 0, pendingInvoices: 0, approvedInvoices: 0, highRiskInvoices: 0 }, statusBreakdown, riskBreakdown } });
  } catch (error) {
    logger.error('Get invoice stats error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
