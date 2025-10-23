import crypto from 'crypto';
import AuditEntry from '../models/AuditEntry.js';
import logger from '../utils/logger.js';

class AuditService {
  constructor() {
    this.previousHash = '0'.repeat(64);
  }

  async createAuditEntry(params) {
    try {
      const lastEntry = await AuditEntry.findOne().sort({ timestamp: -1 });
      if (lastEntry) this.previousHash = lastEntry.hash;

      const entryData = {
        timestamp: new Date(),
        action: params.action,
        userId: params.userId,
        username: params.username,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sensitivity: params.sensitivity || 'INTERNAL',
        complianceTags: params.complianceTags || [],
        previousHash: this.previousHash,
        success: params.success !== undefined ? params.success : true,
        errorMessage: params.errorMessage,
      };

      const hash = this.calculateHash(entryData);
      const signature = this.generateSignature(entryData);

      const auditEntry = await AuditEntry.create({ ...entryData, hash, signature });

      this.previousHash = hash;

      logger.info(`Audit: ${params.action} by ${params.username} on ${params.resourceType}:${params.resourceId}`);

      return auditEntry;
    } catch (error) {
      logger.error('Failed to create audit entry:', error);
      throw error;
    }
  }

  async getUserAuditTrail(userId, startDate, endDate, limit = 100) {
    const query = { userId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }
    return await AuditEntry.find(query).sort({ timestamp: -1 }).limit(limit);
  }

  async getResourceAuditTrail(resourceType, resourceId) {
    return await AuditEntry.find({ resourceType, resourceId }).sort({ timestamp: -1 }).populate('userId', 'name email');
  }

  async getRecentAudits(limit = 50, filters) {
    const query = {};
    if (filters) {
      if (filters.action) query.action = filters.action;
      if (filters.userId) query.userId = filters.userId;
      if (filters.resourceType) query.resourceType = filters.resourceType;
      if (filters.complianceTags && filters.complianceTags.length > 0) query.complianceTags = { $in: filters.complianceTags };
    }
    return await AuditEntry.find(query).sort({ timestamp: -1 }).limit(limit).populate('userId', 'name email');
  }

  async verifyChainIntegrity(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const entries = await AuditEntry.find(query).sort({ timestamp: 1 });
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const calculatedHash = this.calculateHash({ timestamp: entry.timestamp, action: entry.action, userId: String(entry.userId), username: entry.username, resourceType: entry.resourceType, resourceId: entry.resourceId, details: entry.details, ipAddress: entry.ipAddress, userAgent: entry.userAgent, sensitivity: entry.sensitivity, complianceTags: entry.complianceTags, previousHash: entry.previousHash, success: entry.success, errorMessage: entry.errorMessage });

      if (calculatedHash !== entry.hash) {
        errors.push({ entryId: String(entry._id), error: 'Hash mismatch - entry may have been tampered with', details: { expected: entry.hash, actual: calculatedHash } });
      }

      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          errors.push({ entryId: String(entry._id), error: 'Chain broken - previous hash mismatch', details: { previousEntryId: String(previousEntry._id), expectedPreviousHash: previousEntry.hash, actualPreviousHash: entry.previousHash } });
        }
      }
    }

    return { valid: errors.length === 0, totalEntries: entries.length, errors };
  }

  async generateComplianceReport(startDate, endDate, complianceStandards) {
    const query = { timestamp: { $gte: startDate, $lte: endDate } };
    if (complianceStandards && complianceStandards.length > 0) query.complianceTags = { $in: complianceStandards };
    const entries = await AuditEntry.find(query);

    const statistics = { totalEntries: entries.length, uniqueUsers: new Set(entries.map((e) => String(e.userId))).size, actionBreakdown: this.countByField(entries, 'action'), sensitivityBreakdown: this.countByField(entries, 'sensitivity'), failureCount: entries.filter((e) => !e.success).length, successRate: ((entries.filter((e) => e.success).length / entries.length) * 100).toFixed(2) + '%' };

    const violations = entries.filter((e) => !e.success || e.action === 'ACCESS_DENIED').map((e) => ({ timestamp: e.timestamp, user: e.username, action: e.action, resource: `${e.resourceType}:${e.resourceId}`, error: e.errorMessage }));

    const chainIntegrity = await this.verifyChainIntegrity(startDate, endDate);

    return { reportId: crypto.randomBytes(16).toString('hex'), period: { start: startDate, end: endDate }, standards: complianceStandards || [], statistics, violations, chainIntegrity };
  }

  calculateHash(data) {
    const dataString = JSON.stringify({ timestamp: data.timestamp, action: data.action, userId: data.userId, username: data.username, resourceType: data.resourceType, resourceId: data.resourceId, details: data.details, previousHash: data.previousHash, success: data.success });
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  generateSignature(data) {
    const secret = process.env.AUDIT_SECRET || 'change_this_secret_in_production';
    const dataString = JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(dataString).digest('hex');
  }

  countByField(entries, field) {
    const counts = {};
    for (const entry of entries) {
      const value = String(entry[field] || 'unknown');
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }

  async searchAuditLogs(searchParams, limit = 100, skip = 0) {
    const query = {};
    if (searchParams.userId) query.userId = searchParams.userId;
    if (searchParams.action) query.action = searchParams.action;
    if (searchParams.resourceType) query.resourceType = searchParams.resourceType;
    if (searchParams.sensitivity) query.sensitivity = searchParams.sensitivity;
    if (searchParams.complianceTags && searchParams.complianceTags.length > 0) query.complianceTags = { $in: searchParams.complianceTags };
    if (searchParams.startDate || searchParams.endDate) {
      query.timestamp = {};
      if (searchParams.startDate) query.timestamp.$gte = searchParams.startDate;
      if (searchParams.endDate) query.timestamp.$lte = searchParams.endDate;
    }
    if (searchParams.keyword) query.$or = [{ username: { $regex: searchParams.keyword, $options: 'i' } }, { resourceId: { $regex: searchParams.keyword, $options: 'i' } }, { 'details.description': { $regex: searchParams.keyword, $options: 'i' } }];

    const total = await AuditEntry.countDocuments(query);
    const entries = await AuditEntry.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('userId', 'name email');

    return { entries, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) };
  }
}

export default new AuditService();