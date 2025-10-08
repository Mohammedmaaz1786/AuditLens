export type Invoice = {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Flagged';
  riskScore: number;
};

export const invoices: Invoice[] = [
  { id: 'INV-001', invoiceNumber: '2024-101', vendorName: 'Innovate LLC', amount: 2500.00, date: '2024-07-15', status: 'Paid', riskScore: 0.1 },
  { id: 'INV-002', invoiceNumber: '2024-102', vendorName: 'Solutions Inc', amount: 150.75, date: '2024-07-18', status: 'Pending', riskScore: 0.3 },
  { id: 'INV-003', invoiceNumber: '2024-103', vendorName: 'Data Systems', amount: 5000.00, date: '2024-06-20', status: 'Overdue', riskScore: 0.2 },
  { id: 'INV-004', invoiceNumber: '2024-104', vendorName: 'Synergy Corp', amount: 1250.50, date: '2024-07-22', status: 'Pending', riskScore: 0.05 },
  { id: 'INV-005', invoiceNumber: '2024-105', vendorName: 'Innovate LLC', amount: 300.00, date: '2024-07-01', status: 'Paid', riskScore: 0.1 },
  { id: 'INV-006', invoiceNumber: '2024-106', vendorName: 'Matrix Solutions', amount: 10000.00, date: '2024-07-25', status: 'Flagged', riskScore: 0.92 },
  { id: 'INV-007', invoiceNumber: '2024-107', vendorName: 'Solutions Inc', amount: 450.00, date: '2024-07-11', status: 'Paid', riskScore: 0.3 },
  { id: 'INV-008', invoiceNumber: '2024-108', vendorName: 'Quantum Innovations', amount: 7500.00, date: '2024-07-28', status: 'Pending', riskScore: 0.65 },
  { id: 'INV-009', invoiceNumber: '2024-109', vendorName: 'Data Systems', amount: 800.00, date: '2024-07-05', status: 'Paid', riskScore: 0.2 },
  { id: 'INV-010', invoiceNumber: '2024-110', vendorName: 'Synergy Corp', amount: 950.25, date: '2024-05-30', status: 'Overdue', riskScore: 0.05 },
];

export type Vendor = {
  id: string;
  name: string;
  riskScore: number;
  contractStatus: 'Active' | 'Expired' | 'Pending Review';
  isBlacklisted: boolean;
  onboardingDate: string;
  logoId: string;
};

export const vendors: Vendor[] = [
  { id: 'VEN-001', name: 'Innovate LLC', riskScore: 0.1, contractStatus: 'Active', isBlacklisted: false, onboardingDate: '2022-01-10', logoId: 'vendor-logo-1' },
  { id: 'VEN-002', name: 'Solutions Inc', riskScore: 0.3, contractStatus: 'Active', isBlacklisted: false, onboardingDate: '2021-05-20', logoId: 'vendor-logo-2' },
  { id: 'VEN-003', name: 'Data Systems', riskScore: 0.2, contractStatus: 'Expired', isBlacklisted: false, onboardingDate: '2020-11-30', logoId: 'vendor-logo-3' },
  { id: 'VEN-004', name: 'Synergy Corp', riskScore: 0.05, contractStatus: 'Active', isBlacklisted: false, onboardingDate: '2023-03-15', logoId: 'vendor-logo-4' },
  { id: 'VEN-005', name: 'Matrix Solutions', riskScore: 0.92, contractStatus: 'Pending Review', isBlacklisted: true, onboardingDate: '2023-10-25', logoId: 'vendor-logo-5' },
  { id: 'VEN-006', name: 'Quantum Innovations', riskScore: 0.65, contractStatus: 'Active', isBlacklisted: false, onboardingDate: '2023-08-01', logoId: 'vendor-logo-1' },
];

export type AuditLog = {
    id: string;
    user: string;
    userRole: 'Admin' | 'Auditor' | 'Analyst';
    action: string;
    timestamp: string;
    details: string;
}

export const auditLogs: AuditLog[] = [
    { id: 'LOG-001', user: 'admin@auditlens.com', userRole: 'Admin', action: 'User added', details: 'Added user analyst@auditlens.com', timestamp: '2024-07-29T10:00:00Z' },
    { id: 'LOG-002', user: 'auditor@auditlens.com', userRole: 'Auditor', action: 'Invoice uploaded', details: 'Uploaded INV-006', timestamp: '2024-07-29T10:05:00Z' },
    { id: 'LOG-003', user: 'analyst@auditlens.com', userRole: 'Analyst', action: 'Vendor viewed', details: 'Viewed details for Synergy Corp', timestamp: '2024-07-29T10:15:00Z' },
    { id: 'LOG-004', user: 'auditor@auditlens.com', userRole: 'Auditor', action: 'Invoice flagged', details: 'Manually flagged INV-008 for review', timestamp: '2024-07-29T11:30:00Z' },
    { id: 'LOG-005', user: 'admin@auditlens.com', userRole: 'Admin', action: 'Settings changed', details: 'Updated compliance threshold to 0.7', timestamp: '2024-07-29T14:00:00Z' },
];

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Auditor' | 'Analyst';
    status: 'Active' | 'Inactive';
    lastLogin: string;
}

export const users: User[] = [
    { id: 'USR-001', name: 'Admin User', email: 'admin@auditlens.com', role: 'Admin', status: 'Active', lastLogin: '2024-07-29T14:00:00Z' },
    { id: 'USR-002', name: 'Auditor User', email: 'auditor@auditlens.com', role: 'Auditor', status: 'Active', lastLogin: '2024-07-29T11:30:00Z' },
    { id: 'USR-003', name: 'Analyst User', email: 'analyst@auditlens.com', role: 'Analyst', status: 'Active', lastLogin: '2024-07-29T10:15:00Z' },
    { id: 'USR-004', name: 'Inactive User', email: 'inactive@auditlens.com', role: 'Analyst', status: 'Inactive', lastLogin: '2024-06-15T09:00:00Z' },
];
