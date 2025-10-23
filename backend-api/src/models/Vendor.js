import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vendor name is required'], trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    taxId: { type: String, trim: true },
    category: { type: String, trim: true },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    totalInvoices: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

VendorSchema.index({ name: 1 });
VendorSchema.index({ email: 1 });
VendorSchema.index({ riskScore: -1 });

export default mongoose.model('Vendor', VendorSchema);
