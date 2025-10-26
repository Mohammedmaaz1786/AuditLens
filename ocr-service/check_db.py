from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/auditlens')
db = client.get_default_database()

# Check invoice
invoice = db.invoices.find_one({'invoiceNumber': 'INV-2024-001'})
print("=== INVOICE DATA ===")
print(f"Invoice Number: {invoice.get('invoiceNumber')}")
print(f"Vendor Name: {invoice.get('vendorName')}")
print(f"Vendor ID: {invoice.get('vendorId')}")
print(f"Total Amount: {invoice.get('totalAmount')}")
print(f"Subtotal: {invoice.get('subtotal')}")
print(f"Tax: {invoice.get('tax')}")
print(f"Currency: {invoice.get('currency')}")
print(f"Line Items: {len(invoice.get('lineItems', []))}")

# Check vendor
vendor = db.vendors.find_one({'name': 'TechSupply Solutions Pvt Ltd'})
print("\n=== VENDOR DATA ===")
if vendor:
    print(f"Vendor ID: {vendor.get('_id')}")
    print(f"Name: {vendor.get('name')}")
    print(f"Status: {vendor.get('status')}")
    print(f"Email: {vendor.get('email')}")
    print(f"Total Invoices: {vendor.get('totalInvoices')}")
else:
    print("Vendor NOT found in database!")

# Check duplicate invoices
duplicate_count = db.invoices.count_documents({'invoiceNumber': 'INV-2024-001'})
print(f"\n=== DUPLICATE CHECK ===")
print(f"Invoices with number INV-2024-001: {duplicate_count}")

if duplicate_count > 1:
    all_dupes = list(db.invoices.find({'invoiceNumber': 'INV-2024-001'}))
    for idx, dupe in enumerate(all_dupes, 1):
        print(f"  {idx}. ID: {dupe.get('_id')}, Amount: {dupe.get('totalAmount')}, Created: {dupe.get('createdAt')}")
