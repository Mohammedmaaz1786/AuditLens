import mongoose from 'mongoose';

const AuditEntrySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, default: Date.now, immutable: true },
    action: { type: String, required: true, enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT', 'ACCESS_DENIED'], immutable: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    username: { type: String, required: true, immutable: true },
    resourceType: { type: String, required: true, immutable: true },
    resourceId: { type: String, required: true, immutable: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
    ipAddress: { type: String, immutable: true },
    userAgent: { type: String, immutable: true },
    sensitivity: { type: String, enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'], default: 'INTERNAL', immutable: true },
    complianceTags: { type: [String], default: [], immutable: true },
    previousHash: { type: String, required: true, immutable: true },
    hash: { type: String, required: true, unique: true, immutable: true },
    signature: { type: String, required: true, immutable: true },
    success: { type: Boolean, default: true, immutable: true },
    errorMessage: { type: String, immutable: true },
  },
  { timestamps: false, collection: 'audit_trail' }
);

AuditEntrySchema.index({ timestamp: -1 });
AuditEntrySchema.index({ userId: 1, timestamp: -1 });
AuditEntrySchema.index({ resourceType: 1, resourceId: 1 });
AuditEntrySchema.index({ action: 1, timestamp: -1 });
AuditEntrySchema.index({ complianceTags: 1 });
AuditEntrySchema.index({ hash: 1 }, { unique: true });

AuditEntrySchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Audit entries cannot be modified'));
  }
  next();
});

AuditEntrySchema.pre('deleteOne', function(next) {
  next(new Error('Audit entries cannot be deleted'));
});

AuditEntrySchema.pre('deleteMany', function(next) {
  next(new Error('Audit entries cannot be deleted'));
});

export default mongoose.model('AuditEntry', AuditEntrySchema);