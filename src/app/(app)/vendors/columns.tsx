"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { Vendor } from "@/lib/data"
import { MoreHorizontal, ArrowUpDown, Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import placeholderImagesData from '@/lib/placeholder-images.json';

const RiskIcon = ({ score }: { score: number }) => {
    if (score > 0.75) return <ShieldAlert className="h-4 w-4 text-destructive" />
    if (score > 0.4) return <Shield className="h-4 w-4 text-yellow-500" />
    return <ShieldCheck className="h-4 w-4 text-green-500" />
}


export const columns: ColumnDef<Vendor>[] = [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Vendor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
    },
    cell: ({ row }) => {
        const logo = placeholderImagesData.placeholderImages.find(p => p.id === row.original.logoId)
        return (
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {logo && <AvatarImage src={logo.imageUrl} alt={row.getValue("name")} />}
                  <AvatarFallback>{(row.getValue("name") as string).charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{row.getValue("name")}</span>
            </div>
        )
    },
  },
  {
    accessorKey: "riskScore",
    header: "Risk Score",
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("riskScore"))
      const percentage = (score * 100).toFixed(0);
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (score > 0.75) variant = 'destructive';
      else if (score > 0.4) variant = 'outline';
      
      return <div className="flex items-center gap-2">
        <RiskIcon score={score} />
        <Badge variant={variant}>{percentage}%</Badge>
      </div>
    },
  },
  {
    accessorKey: "contractStatus",
    header: "Contract Status",
    cell: ({ row }) => {
        const status = row.getValue("contractStatus") as string;
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        if (status === 'Active') variant = 'default';
        if (status === 'Expired') variant = 'destructive';
  
        return <Badge variant={variant} className="capitalize">{status}</Badge>
      },
  },
  {
    accessorKey: "isBlacklisted",
    header: "Blacklisted",
    cell: ({ row }) => {
        return row.getValue("isBlacklisted") ? 
            <div className="flex items-center gap-2 text-destructive">
                <ShieldX className="h-4 w-4" /> Yes
            </div> : 
            <span className="text-muted-foreground">No</span>
    },
  },
  {
    accessorKey: "onboardingDate",
    header: "Onboarded",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const vendor = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(vendor.id)}
            >
              Copy vendor ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit vendor</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
