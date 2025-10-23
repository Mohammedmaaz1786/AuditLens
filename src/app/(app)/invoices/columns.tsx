"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { Invoice } from "@/lib/data"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface ColumnsProps {
  onViewDetails: (invoice: any, action?: 'approve' | 'reject') => void;
}

export const columns = ({ onViewDetails }: ColumnsProps): ColumnDef<Invoice>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="hidden sm:flex"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="hidden sm:flex"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 sm:px-4"
          >
            <span className="text-xs sm:text-sm">Invoice</span>
            <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )
      },
    cell: ({ row }) => <div className="font-medium text-xs sm:text-sm">{row.getValue("invoiceNumber")}</div>,
    size: 120,
  },
  {
    accessorKey: "vendorName",
    header: "Vendor",
    cell: ({ row }) => <div className="text-xs sm:text-sm max-w-[150px] truncate">{row.getValue("vendorName")}</div>,
    size: 150,
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right text-xs sm:text-sm">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)

      return <div className="text-right font-medium text-xs sm:text-sm">{formatted}</div>
    },
    size: 100,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (status === 'Paid') variant = 'default';
      if (status === 'Overdue') variant = 'destructive';
      if (status === 'Flagged') variant = 'destructive';

      return <Badge variant={variant} className="capitalize text-[10px] sm:text-xs">{status}</Badge>
    },
    size: 80,
  },
  {
    accessorKey: "invoiceDate",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("invoiceDate") as string;
      return <div className="text-xs sm:text-sm">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
    },
    size: 100,
  },
  {
    id: "actions",
    size: 50,
    cell: ({ row }) => {
      const invoice = row.original as any

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(invoice)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              // Extract vendor ID properly - handle both string and object formats
              const vendorId = typeof invoice.vendor === 'string' 
                ? invoice.vendor 
                : invoice.vendor?._id || invoice.vendor?.id;
              
              if (vendorId) {
                window.location.href = `/vendors/${vendorId}`;
              } else {
                console.error('Vendor ID not found in invoice:', invoice);
                alert('Unable to navigate: Vendor information not available');
              }
            }}>
              View Vendor
            </DropdownMenuItem>
            {invoice.status === 'pending' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onViewDetails(invoice, 'approve')}
                  className="text-green-600 focus:text-green-600"
                >
                  Approve Invoice
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onViewDetails(invoice, 'reject')}
                  className="text-red-600 focus:text-red-600"
                >
                  Reject Invoice
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
