import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({ description: { type: String, required: true }, quantity: { type: Number, required: true, min: 0 }, unitPrice: { type: Number, required: true, min: 0 }, amount: { type: Number, required: true, min: 0 } });

const FraudDetectionSchema = new mongoose.Schema({ type: { type: String, required: true }, severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: true }, score: { type: Number, required: true }, details: { type: String, required: true } });

const FraudAnalysisSchema = new mongoose.Schema({ riskLevel: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: true }, overallScore: { type: Number, required: true }, detections: [FraudDetectionSchema], warnings: [{ type: String }], timestamp: { type: Date, default: Date.now } });

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: [true, 'Invoice number is required'], trim: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    vendorName: { type: String, required: [true, 'Vendor name is required'], trim: true },
    vendorEmail: { type: String, trim: true },
    vendorPhone: { type: String, trim: true },
    vendorAddress: { type: String, trim: true },
    billToName: { type: String, trim: true },
    billToAddress: { type: String, trim: true },
    billToEmail: { type: String, trim: true },
    billToPhone: { type: String, trim: true },
    billToCompany: { type: String, trim: true },
    customerName: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    shipToName: { type: String, trim: true },
    shipToAddress: { type: String, trim: true },
    invoiceDate: { type: Date, required: [true, 'Invoice date is required'], index: true },
    dueDate: { type: Date },
    totalAmount: { type: Number, required: [true, 'Total amount is required'], min: 0 },
    taxAmount: { type: Number, min: 0 },
    subtotal: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid', 'overdue', 'flagged'], default: 'pending', index: true },
    lineItems: [LineItemSchema],
    notes: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    poNumber: { type: String, trim: true },
    ocrConfidence: { type: Number, min: 0, max: 1 },
    ocrRawText: { type: String },
    originalFileName: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    fraudAnalysis: FraudAnalysisSchema,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ vendor: 1, invoiceDate: -1 });
InvoiceSchema.index({ status: 1, invoiceDate: -1 });
InvoiceSchema.index({ totalAmount: -1 });
InvoiceSchema.index({ 'fraudAnalysis.riskLevel': 1 });

export default mongoose.model('Invoice', InvoiceSchema);
