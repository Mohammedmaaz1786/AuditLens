"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ShieldAlert, AlertCircle, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FraudFlag {
  type: string;
  severity: string;
  description: string;
  confidence?: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number;
  date: string;
  fraudAnalysis?: {
    risk_level: string;
    risk_score: number;
    fraud_detected: boolean;
    detections: FraudFlag[];
    warnings: FraudFlag[];
  };
  createdAt: string;
}

export default function SecurityPage() {
  const [flaggedInvoices, setFlaggedInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  useEffect(() => {
    fetchFlaggedInvoices();
  }, []);

  async function fetchFlaggedInvoices() {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const invoices = data.invoices || data.data?.invoices || [];
        
        // Filter invoices with fraud flags
        const flagged = invoices.filter((inv: Invoice) => 
          inv.fraudAnalysis && 
          (inv.fraudAnalysis.fraud_detected || 
           inv.fraudAnalysis.detections?.length > 0 || 
           inv.fraudAnalysis.warnings?.length > 0)
        );
        
        setFlaggedInvoices(flagged);

        // Calculate stats
        const newStats = {
          critical: flagged.filter((inv: Invoice) => inv.fraudAnalysis?.risk_level?.toUpperCase() === 'CRITICAL').length,
          high: flagged.filter((inv: Invoice) => inv.fraudAnalysis?.risk_level?.toUpperCase() === 'HIGH').length,
          medium: flagged.filter((inv: Invoice) => inv.fraudAnalysis?.risk_level?.toUpperCase() === 'MEDIUM').length,
          low: flagged.filter((inv: Invoice) => inv.fraudAnalysis?.risk_level?.toUpperCase() === 'LOW').length,
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch flagged invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getAllFlags = (invoice: Invoice): FraudFlag[] => {
    const flags: FraudFlag[] = [];
    if (invoice.fraudAnalysis) {
      if (invoice.fraudAnalysis.detections) {
        flags.push(...invoice.fraudAnalysis.detections);
      }
      if (invoice.fraudAnalysis.warnings) {
        flags.push(...invoice.fraudAnalysis.warnings);
      }
    }
    return flags;
  };

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel?.toUpperCase()) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'outline';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Security Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Monitor fraud detection and flagged invoices in real-time.</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-200 card-hover">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Critical Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 card-hover">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.high}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Review required</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 card-hover">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Medium Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.medium}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Monitor closely</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 card-hover">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Low Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.low}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Informational</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive"/>
            Flagged Invoices
          </CardTitle>
          <CardDescription>Invoices with fraud detection alerts and warnings.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : flaggedInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No flagged invoices found. All invoices appear legitimate.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedInvoices.map(invoice => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.vendorName}</TableCell>
                    <TableCell>${invoice.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getRiskColor(invoice.fraudAnalysis?.risk_level)}>
                        {invoice.fraudAnalysis?.risk_level || 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">{getAllFlags(invoice).length} issues</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getTimeAgo(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fraud Analysis Details</DialogTitle>
            <DialogDescription>
              Invoice: {selectedInvoice?.invoiceNumber} | Vendor: {selectedInvoice?.vendorName}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <Badge variant={getRiskColor(selectedInvoice.fraudAnalysis?.risk_level)} className="mt-1">
                    {selectedInvoice.fraudAnalysis?.risk_level}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="text-lg font-bold">
                    {Math.round((selectedInvoice.fraudAnalysis?.risk_score || 0) * 100)}/100
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">${selectedInvoice.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedInvoice.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Detected Issues ({getAllFlags(selectedInvoice).length})
                </h4>
                <div className="space-y-2">
                  {getAllFlags(selectedInvoice).map((flag, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{flag.type}</span>
                          <Badge variant="outline" className="text-xs">
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
