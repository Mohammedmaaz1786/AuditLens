"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { AlertTriangle, Loader2, Plus, Eye, FileText, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  website?: string;
  contactPerson?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  date: string;
  status: string;
  fraudAnalysis?: {
    risk_level: string;
  };
}

function VendorsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorInvoices, setVendorInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    website: "",
    contactPerson: "",
    paymentTerms: "",
    notes: "",
  });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVendors({ page: 1, limit: 100 });
      if (response.success && response.data) {
        setVendors(response.data.vendors);
        setError(null);
        
        // Auto-open vendor if highlight parameter is present
        if (highlightId) {
          const vendorToHighlight = response.data.vendors.find((v: Vendor) => v._id === highlightId);
          if (vendorToHighlight) {
            // Open vendor details dialog
            setSelectedVendor(vendorToHighlight);
            fetchVendorInvoices(vendorToHighlight.name);
          }
        }
      } else {
        setError("Failed to load vendors");
      }
    } catch (err: any) {
      console.error("Error fetching vendors:", err);
      setError(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorInvoices = async (vendorName: string) => {
    try {
      setLoadingInvoices(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/v1/invoices?vendor=${encodeURIComponent(vendorName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns { success: true, data: { invoices: [...], pagination: {...} } }
        setVendorInvoices(data.data?.invoices || []);
        console.log(`✓ Fetched ${data.data?.invoices?.length || 0} invoices for vendor: ${vendorName}`);
      } else {
        console.error('Failed to fetch vendor invoices:', response.status, response.statusText);
        setVendorInvoices([]);
      }
    } catch (error) {
      console.error('Failed to fetch vendor invoices:', error);
      setVendorInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleAddVendor = async () => {
    if (!newVendor.name.trim()) {
      alert("Vendor name is required");
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/v1/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newVendor),
      });

      if (response.ok) {
        setIsAddDialogOpen(false);
        setNewVendor({
          name: "",
          email: "",
          phone: "",
          address: "",
          taxId: "",
          website: "",
          contactPerson: "",
          paymentTerms: "",
          notes: "",
        });
        fetchVendors();
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to add vendor");
      }
    } catch (error) {
      console.error('Failed to add vendor:', error);
      alert("Failed to add vendor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetails = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    await fetchVendorInvoices(vendor.name);
  };

  const handleActivateVendor = async (vendorId: string) => {
    try {
      const response = await apiClient.updateVendor(vendorId, { status: 'active' });
      if (response.success) {
        alert('Vendor activated successfully');
        fetchVendors();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to activate vendor');
    }
  };

  const handleDeactivateVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to deactivate this vendor?')) return;
    
    try {
      const response = await apiClient.updateVendor(vendorId, { status: 'inactive' });
      if (response.success) {
        alert('Vendor deactivated successfully');
        fetchVendors();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate vendor');
    }
  };

  const handleBlockVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to block this vendor? This will prevent all transactions.')) return;
    
    try {
      const response = await apiClient.updateVendor(vendorId, { status: 'blocked' });
      if (response.success) {
        alert('Vendor blocked successfully');
        fetchVendors();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to block vendor');
    }
  };

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('user_role') || 'user';
    setUserRole(role);
    fetchVendors();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Vendors</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchVendors}>Retry</Button>
        </div>
      </div>
    );
  }

  // Create columns with role-based actions
  const vendorColumns = columns({
    onViewDetails: handleViewDetails,
    onActivateVendor: handleActivateVendor,
    onDeactivateVendor: handleDeactivateVendor,
    onBlockVendor: handleBlockVendor,
    userRole: userRole
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and assess all company vendors - Real-time data from MongoDB
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Enter vendor information to add to the system.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Vendor Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Acme Corporation"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@vendor.com"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    placeholder="XX-XXXXXXX"
                    value={newVendor.taxId}
                    onChange={(e) => setNewVendor({ ...newVendor, taxId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="123 Main St, City, State ZIP"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://vendor.com"
                    value={newVendor.website}
                    onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    placeholder="John Doe"
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="e.g., Net 30"
                  value={newVendor.paymentTerms}
                  onChange={(e) => setNewVendor({ ...newVendor, paymentTerms: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this vendor..."
                  value={newVendor.notes}
                  onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddVendor} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Vendor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <DataTable 
          columns={vendorColumns} 
          data={vendors.map(v => ({
            ...v,
            // ensure the shape expected by DataTable by providing defaults for missing fields
            riskScore: (v as any).riskScore ?? 0,
            totalInvoices: (v as any).totalInvoices ?? 0,
            totalAmount: (v as any).totalAmount ?? 0,
            isActive: (v as any).isActive ?? true,
          }))}
          filterColumn="name"
          filterPlaceholder="Filter by vendor name..."
        />
      </div>

      {/* Vendor Details Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedVendor?.name}
            </DialogTitle>
            <DialogDescription>
              Complete vendor details and invoice history
            </DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-6">
              {/* Vendor Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendor Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedVendor.email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedVendor.email}</p>
                      </div>
                    )}
                    {selectedVendor.phone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedVendor.phone}</p>
                      </div>
                    )}
                    {selectedVendor.address && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedVendor.address}</p>
                      </div>
                    )}
                    {selectedVendor.taxId && (
                      <div>
                        <p className="text-muted-foreground">Tax ID</p>
                        <p className="font-medium">{selectedVendor.taxId}</p>
                      </div>
                    )}
                    {selectedVendor.website && (
                      <div>
                        <p className="text-muted-foreground">Website</p>
                        <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          {selectedVendor.website}
                        </a>
                      </div>
                    )}
                    {selectedVendor.contactPerson && (
                      <div>
                        <p className="text-muted-foreground">Contact Person</p>
                        <p className="font-medium">{selectedVendor.contactPerson}</p>
                      </div>
                    )}
                    {selectedVendor.paymentTerms && (
                      <div>
                        <p className="text-muted-foreground">Payment Terms</p>
                        <p className="font-medium">{selectedVendor.paymentTerms}</p>
                      </div>
                    )}
                  </div>
                  {selectedVendor.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-muted-foreground text-sm mb-1">Notes</p>
                      <p className="text-sm">{selectedVendor.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Invoices ({vendorInvoices.length})
                  </CardTitle>
                  <CardDescription>
                    All invoices from this vendor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingInvoices ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-muted-foreground">Loading invoices...</p>
                    </div>
                  ) : vendorInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices found for this vendor
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorInvoices.map((invoice) => (
                          <TableRow key={invoice._id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                            <TableCell>${invoice.totalAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                invoice.status === 'paid' ? 'default' :
                                invoice.status === 'pending' ? 'secondary' :
                                'outline'
                              }>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {invoice.fraudAnalysis?.risk_level ? (
                                <Badge variant={
                                  invoice.fraudAnalysis.risk_level === 'CRITICAL' || invoice.fraudAnalysis.risk_level === 'HIGH' ? 'destructive' :
                                  invoice.fraudAnalysis.risk_level === 'MEDIUM' ? 'outline' :
                                  'secondary'
                                }>
                                  {invoice.fraudAnalysis.risk_level}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">No flags</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VendorsContent />
    </Suspense>
  );
}
