// ⚠️ DEPRECATED: This file contains MOCK DATA for demonstration only
// ⚠️ DO NOT USE THIS DATA - All pages should fetch real data from MongoDB via API
// ⚠️ Types are kept here temporarily for backwards compatibility with column definitions

export type Invoice = {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Flagged';
  riskScore: number;
};

// DEPRECATED: Do not use - fetch real data using apiClient.getInvoices()
export const invoices: Invoice[] = [];

export type Vendor = {
  id: string;
  name: string;
  riskScore: number;
  contractStatus: 'Active' | 'Expired' | 'Pending Review';
  isBlacklisted: boolean;
  onboardingDate: string;
  logoId: string;
};

// DEPRECATED: Do not use - fetch real data using apiClient.getVendors()
export const vendors: Vendor[] = [];

export type AuditLog = {
    id: string;
    user: string;
    userRole: 'Admin' | 'Auditor' | 'Analyst';
    action: string;
    timestamp: string;
    details: string;
}

// DEPRECATED: Do not use - fetch real data using apiClient.getAuditLogs()
export const auditLogs: AuditLog[] = [];

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Auditor' | 'Analyst';
    status: 'Active' | 'Inactive';
    lastLogin: string;
}

// DEPRECATED: Do not use - fetch real data using apiClient.getUsers()
export const users: User[] = [];
