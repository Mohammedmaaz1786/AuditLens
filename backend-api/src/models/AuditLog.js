import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: [true, 'Action is required'], trim: true, index: true },
    resource: { type: String, required: [true, 'Resource is required'], trim: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    status: { type: String, enum: ['success', 'failure'], required: true, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });

export default mongoose.model('AuditLog', AuditLogSchema);