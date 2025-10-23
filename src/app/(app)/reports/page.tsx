"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileText, TrendingUp, AlertTriangle, DollarSign, FileCheck, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  avgAmount: number;
  pendingInvoices: number;
  approvedInvoices: number;
  highRiskInvoices: number;
}

interface StatusBreakdown {
  _id: string;
  count: number;
}

interface RiskBreakdown {
  _id: string;
  count: number;
}

interface TimeSeriesData {
  month: string;
  invoiceCount: number;
  totalAmount: number;
  avgAmount: number;
  flaggedCount: number;
}

const COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626',
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  paid: '#3b82f6',
  overdue: '#dc2626',
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [riskBreakdown, setRiskBreakdown] = useState<RiskBreakdown[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Fetch invoice stats
      const statsResponse = await fetch('http://localhost:5000/api/v1/invoices/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data.overview);
          setStatusBreakdown(statsData.data.statusBreakdown || []);
          setRiskBreakdown(statsData.data.riskBreakdown || []);
          setHasData(statsData.data.overview.totalInvoices > 0);
        }
      }

      // Fetch all invoices for time series analysis
      const invoicesResponse = await fetch('http://localhost:5000/api/v1/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        if (invoicesData.success && invoicesData.data.length > 0) {
          generateTimeSeriesData(invoicesData.data);
        }
      }

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (invoices: any[]) => {
    // Group invoices by month
    const monthlyData: { [key: string]: any } = {};
    
    invoices.forEach((invoice) => {
      const date = new Date(invoice.invoiceDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          invoiceCount: 0,
          totalAmount: 0,
          flaggedCount: 0,
        };
      }
      
      monthlyData[monthKey].invoiceCount += 1;
      monthlyData[monthKey].totalAmount += invoice.totalAmount || 0;
      
      if (invoice.fraudAnalysis?.risk_level === 'HIGH' || invoice.fraudAnalysis?.risk_level === 'CRITICAL') {
        monthlyData[monthKey].flaggedCount += 1;
      }
    });
    
    // Sort by month and calculate average
    const sortedData = Object.keys(monthlyData)
      .sort()
      .map(key => ({
        ...monthlyData[key],
        avgAmount: monthlyData[key].totalAmount / monthlyData[key].invoiceCount,
      }));
    
    setTimeSeriesData(sortedData);
  };

  const handleExportCSV = () => {
    if (!stats) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Invoices', stats.totalInvoices],
      ['Total Amount', `$${stats.totalAmount.toLocaleString()}`],
      ['Average Amount', `$${stats.avgAmount.toFixed(2)}`],
      ['Pending Invoices', stats.pendingInvoices],
      ['Approved Invoices', stats.approvedInvoices],
      ['High Risk Invoices', stats.highRiskInvoices],
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Compliance Reports</h1>
            <p className="text-muted-foreground">Visualize compliance trends and generate reports.</p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Upload and process invoices to generate compliance reports and analytics. 
              Reports will automatically populate once you have invoice data in the system.
            </p>
            <Button onClick={() => window.location.href = '/invoices'}>
              <FileText className="mr-2 h-4 w-4" />
              Go to Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Compliance Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Real-time analytics from MongoDB database</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCSV} size="sm" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Generate PDF Report</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInvoices || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingInvoices || 0} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.totalAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: ${(stats?.avgAmount || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.highRiskInvoices || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalInvoices ? ((stats.highRiskInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedInvoices || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalInvoices ? ((stats.approvedInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}% approval rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Time Series - Invoice Count */}
        {timeSeriesData.length > 0 && (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Invoice Trends Over Time</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Monthly invoice count and amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="invoiceCount" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    name="Invoices"
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Flagged Items Over Time */}
        {timeSeriesData.length > 0 && (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Fraud Flags Over Time</CardTitle>
              <CardDescription className="text-xs sm:text-sm">High-risk invoices detected per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="flaggedCount" 
                    fill="#ef4444" 
                    radius={[8, 8, 0, 0]}
                    name="Flagged"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Risk Level Distribution */}
        {riskBreakdown.length > 0 && (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Risk Level Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Invoices by fraud risk category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, count }) => `${_id}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {riskBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry._id as keyof typeof COLORS] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {riskBreakdown.map((item) => (
                  <Badge 
                    key={item._id} 
                    variant="outline"
                    style={{ borderColor: COLORS[item._id as keyof typeof COLORS] || '#94a3b8' }}
                  >
                    {item._id}: {item.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Distribution */}
        {statusBreakdown.length > 0 && (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Invoice Status Breakdown</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Current status of all invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="_id" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 8, 8, 0]}
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry._id as keyof typeof STATUS_COLORS] || '#94a3b8'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
