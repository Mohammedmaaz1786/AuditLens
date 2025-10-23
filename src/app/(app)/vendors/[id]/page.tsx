"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, Calendar, DollarSign, FileText } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorDetails();
  }, [params.id]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor details
      const vendorResponse = await apiClient.getVendor(params.id as string);
      if (vendorResponse.success && vendorResponse.data) {
        setVendor(vendorResponse.data);
      }

      // Fetch vendor's invoices
      const invoicesResponse = await apiClient.getInvoices({
        vendor: params.id as string,
        page: 1,
        limit: 100,
      });
      
      if (invoicesResponse.success && invoicesResponse.data) {
        setInvoices(invoicesResponse.data.invoices || []);
      }

      setError(null);
    } catch (err: any) {
      console.error("Error fetching vendor details:", err);
      setError(err.message || "Failed to load vendor details");
    } finally {
      setLoading(false);
    }
  };

  const invoiceColumns: ColumnDef<any>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice Number",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("invoiceNumber")}</div>
      ),
    },
    {
      accessorKey: "invoiceDate",
      header: "Date",
      cell: ({ row }) => {
        const date = row.getValue("invoiceDate") as string;
        return <div>{new Date(date).toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"));
        return (
          <div className="font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        if (status === "approved") variant = "default";
        if (status === "paid") variant = "default";
        if (status === "rejected") variant = "destructive";
        if (status === "overdue") variant = "destructive";

        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/invoices`)}
        >
          View Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-destructive mb-4">{error || "Vendor not found"}</p>
        <Button onClick={() => router.push("/vendors")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vendors
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      active: { variant: "default", label: "Active" },
      inactive: { variant: "secondary", label: "Inactive" },
      blocked: { variant: "destructive", label: "Blocked" },
    };
    const info = statusMap[status?.toLowerCase()] || { variant: "outline", label: status };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/vendors")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendors
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
          <p className="text-muted-foreground mt-1">
            Vendor details and invoice history
          </p>
        </div>
        {getStatusBadge(vendor.status)}
      </div>

      {/* Vendor Information Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendor.totalInvoices || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(vendor.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendor.riskScore || 0}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(vendor.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {vendor.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{vendor.email}</p>
              </div>
            </div>
          )}
          {vendor.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{vendor.phone}</p>
              </div>
            </div>
          )}
          {vendor.address && (
            <div className="flex items-center gap-2 md:col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{vendor.address}</p>
              </div>
            </div>
          )}
          {vendor.taxId && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tax ID</p>
                <p className="font-medium">{vendor.taxId}</p>
              </div>
            </div>
          )}
          {vendor.paymentTerms && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{vendor.paymentTerms}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <DataTable
              columns={invoiceColumns}
              data={invoices}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found for this vendor
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
