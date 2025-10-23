"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, ArrowUpDown, Shield, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const RiskIcon = ({ score }: { score: number }) => {
    if (score > 75) return <ShieldAlert className="h-4 w-4 text-destructive" />
    if (score > 40) return <Shield className="h-4 w-4 text-yellow-500" />
    return <ShieldCheck className="h-4 w-4 text-green-500" />
}

interface Vendor {
  _id: string;
  name: string;
  email?: string;
  riskScore: number;
  totalInvoices: number;
  totalAmount: number;
  isActive: boolean;
  status?: string;
}

interface ColumnsProps {
  onViewDetails: (vendor: any) => void;
  onActivateVendor?: (vendorId: string) => void;
  onDeactivateVendor?: (vendorId: string) => void;
  onBlockVendor?: (vendorId: string) => void;
  userRole?: string;
}

export const columns = ({ 
  onViewDetails, 
  onActivateVendor,
  onDeactivateVendor,
  onBlockVendor,
  userRole = 'user'
}: ColumnsProps): ColumnDef<Vendor>[] => [
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
    accessorKey: "name",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 sm:px-4"
          >
            <span className="text-xs sm:text-sm">Vendor</span>
            <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )
    },
    cell: ({ row }) => {
        return (
            <div className="flex items-center gap-1 sm:gap-2">
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                  <AvatarFallback className="text-xs">{(row.getValue("name") as string).charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{row.getValue("name")}</span>
            </div>
        )
    },
    size: 150,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      return <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px]">{email || "N/A"}</div>
    },
    size: 150,
  },
  {
    accessorKey: "riskScore",
    header: "Risk",
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("riskScore") as string)
      const percentage = score.toFixed(0);
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (score > 75) variant = 'destructive';
      else if (score > 40) variant = 'outline';
      
      return <div className="flex items-center gap-1 sm:gap-2">
        <RiskIcon score={score} />
        <Badge variant={variant} className="text-[10px] sm:text-xs">{percentage}</Badge>
      </div>
    },
    size: 80,
  },
  {
    accessorKey: "totalInvoices",
    header: () => <div className="text-xs sm:text-sm">Invoices</div>,
    cell: ({ row }) => {
      const total = row.getValue("totalInvoices") as number;
      return <div className="text-xs sm:text-sm">{total}</div>
    },
    size: 70,
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right text-xs sm:text-sm">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount") as string)
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
      const vendor = row.original;
      // Use status field if available, otherwise fall back to isActive
      const status = vendor.status || (vendor.isActive ? 'active' : 'inactive');
      
      let variant: "default" | "secondary" | "destructive" = "default";
      let displayText = "Active";
      
      if (status === 'blocked') {
        variant = "destructive";
        displayText = "Blocked";
      } else if (status === 'inactive') {
        variant = "secondary";
        displayText = "Inactive";
      }
      
      return <Badge variant={variant} className="text-[10px] sm:text-xs">
        {displayText}
      </Badge>
    },
    size: 80,
  },
  {
    id: "actions",
    size: 50,
    cell: ({ row }) => {
      const vendor = row.original as any;
      const isAdmin = userRole === 'admin';
      const vendorStatus = vendor.status?.toLowerCase() || (vendor.isActive ? 'active' : 'inactive');

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(vendor)}>
              View Details
            </DropdownMenuItem>
            
            {/* Admin-only actions */}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                
                {/* Show Activate if vendor is inactive or blocked */}
                {(vendorStatus === 'inactive' || vendorStatus === 'blocked') && (
                  <DropdownMenuItem 
                    onClick={() => onActivateVendor?.(vendor._id)}
                    className="text-green-600 focus:text-green-600"
                  >
                    Activate Vendor
                  </DropdownMenuItem>
                )}
                
                {/* Show Deactivate if vendor is active */}
                {vendorStatus === 'active' && (
                  <DropdownMenuItem 
                    onClick={() => onDeactivateVendor?.(vendor._id)}
                    className="text-yellow-600 focus:text-yellow-600"
                  >
                    Deactivate Vendor
                  </DropdownMenuItem>
                )}
                
                {/* Show Block if vendor is not already blocked */}
                {vendorStatus !== 'blocked' && (
                  <DropdownMenuItem 
                    onClick={() => onBlockVendor?.(vendor._id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    Block Vendor
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
