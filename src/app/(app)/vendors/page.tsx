import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { vendors } from "@/lib/data";
import { Button } from "@/components/ui/button";

export default function VendorsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
      <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Vendors</h1>
            <p className="text-muted-foreground">Manage and assess all company vendors.</p>
        </div>
        <Button>Add Vendor</Button>
      </div>
      <DataTable 
        columns={columns} 
        data={vendors}
        filterColumn="name"
        filterPlaceholder="Filter by vendor name..."
      />
    </div>
  );
}
