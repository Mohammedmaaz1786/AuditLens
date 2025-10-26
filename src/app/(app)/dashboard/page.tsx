"use client";

import {
  Activity,
  AlertTriangle,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";

interface DashboardStats {
  totalInvoices: number;
  totalAmount: number;
  avgAmount: number;
  pendingInvoices: number;
  approvedInvoices: number;
  highRiskInvoices: number;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  avgRiskScore: number;
  highRiskVendors: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number;
  status: string;
  fraudAnalysis?: {
    riskLevel: string;
    overallScore: number;
  };
  invoiceDate: string;
}

export default function DashboardPage() {
  const [invoiceStats, setInvoiceStats] = useState<DashboardStats | null>(null);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch invoice statistics
        const invoiceStatsResponse = await apiClient.getInvoiceStats();
        if (invoiceStatsResponse.success && invoiceStatsResponse.data) {
          const overview = invoiceStatsResponse.data.overview || invoiceStatsResponse.data;
          setInvoiceStats({
            totalInvoices: overview.totalInvoices || 0,
            totalAmount: overview.totalAmount || 0,
            avgAmount: overview.avgAmount || 0,
            pendingInvoices: overview.pendingInvoices || 0,
            approvedInvoices: overview.approvedInvoices || 0,
            highRiskInvoices: overview.highRiskInvoices || 0,
          });
        }

        // Fetch vendor statistics
        const vendorStatsResponse = await apiClient.getVendorStats();
        if (vendorStatsResponse.success && vendorStatsResponse.data) {
          const overview = vendorStatsResponse.data.overview || vendorStatsResponse.data;
          setVendorStats({
            totalVendors: overview.totalVendors || 0,
            activeVendors: overview.activeVendors || 0,
            avgRiskScore: overview.avgRiskScore || 0,
            highRiskVendors: overview.highRiskVendors || 0,
          });
        }

        // Fetch recent invoices (limit to 5)
        const invoicesResponse = await apiClient.getInvoices({
          page: 1,
          limit: 5,
        });
        if (invoicesResponse.success && invoicesResponse.data) {
          setRecentInvoices(invoicesResponse.data.invoices);
        }

        setError(null);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      paid: { variant: "default", label: "Paid" },
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "outline", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      overdue: { variant: "destructive", label: "Overdue" },
    };

    const statusInfo = statusMap[status.toLowerCase()] || {
      variant: "outline" as const,
      label: status,
    };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRiskBadge = (riskLevel?: string, score?: number) => {
    if (!riskLevel) return <Badge variant="outline">N/A</Badge>;

    const riskMap: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      LOW: { variant: "default" },
      MEDIUM: { variant: "secondary" },
      HIGH: { variant: "destructive" },
      CRITICAL: { variant: "destructive" },
    };

    const riskInfo = riskMap[riskLevel] || { variant: "outline" as const };

    return (
      <Badge variant={riskInfo.variant} className="gap-1">
        {riskLevel === "HIGH" || riskLevel === "CRITICAL" ? (
          <AlertTriangle className="h-3 w-3" />
        ) : null}
        {riskLevel} {score ? `(${score})` : ""}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Overview of your invoice auditing and fraud detection system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover border-l-4 border-l-blue-500 animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Amount Processed
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invoiceStats?.totalAmount?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceStats?.totalInvoices || 0} invoices processed
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>Avg: ${invoiceStats?.avgAmount?.toFixed(2) || "0"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-orange-500 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Invoices
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoiceStats?.pendingInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>{invoiceStats?.approvedInvoices || 0} approved</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-red-500 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Risk Alerts
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {invoiceStats?.highRiskInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
            {invoiceStats?.totalInvoices && invoiceStats.totalInvoices > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {((invoiceStats.highRiskInvoices / invoiceStats.totalInvoices) * 100).toFixed(1)}% of total
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-green-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Vendors
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorStats?.activeVendors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {vendorStats?.totalVendors || 0} total vendors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Latest invoice submissions and their status
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/invoices">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found. Upload your first invoice to get started!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.vendorName}</TableCell>
                    <TableCell>
                      ${invoice.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {getRiskBadge(
                        invoice.fraudAnalysis?.riskLevel,
                        invoice.fraudAnalysis?.overallScore
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Invoice Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Amount:</span>
              <span className="font-semibold">
                ${invoiceStats?.avgAmount?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approved:</span>
              <span className="font-semibold">
                {invoiceStats?.approvedInvoices || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-semibold">
                {invoiceStats?.pendingInvoices || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-destructive">High Risk:</span>
              <span className="font-semibold text-destructive">
                {invoiceStats?.highRiskInvoices || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Vendor Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Vendors:</span>
              <span className="font-semibold">
                {vendorStats?.totalVendors || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active:</span>
              <span className="font-semibold">
                {vendorStats?.activeVendors || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Risk Score:</span>
              <span className="font-semibold">
                {vendorStats?.avgRiskScore?.toFixed(1) || "0.0"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-destructive">High Risk Vendors:</span>
              <span className="font-semibold text-destructive">
                {vendorStats?.highRiskVendors || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
