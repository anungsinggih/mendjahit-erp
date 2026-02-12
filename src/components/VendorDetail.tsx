import { useNavigate, useParams } from "react-router-dom";
import { useVendorDetailQuery } from "../hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import { Alert } from "./ui/Alert";
import { Icons } from "./ui/Icons";
import { formatCurrency } from "../lib/format";
import { getErrorMessage } from "../lib/errors";

type VendorType = "SUPPLIER" | "KONVEKSI" | "INTERNAL" | null | undefined;

const getTypeLabel = (type?: VendorType) => {
  switch (type) {
    case "KONVEKSI":
      return "Konveksi";
    case "INTERNAL":
      return "Internal";
    case "SUPPLIER":
    default:
      return "Supplier";
  }
};

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: detailData, isLoading: loading, error: fetchError } = useVendorDetailQuery(id);

  const vendor = detailData?.vendor ?? null;
  const purchases = detailData?.purchases ?? [];
  const lifetimeValue = detailData?.lifetimeValue ?? 0;
  const outstanding = detailData?.outstanding ?? null;
  const error = fetchError ? getErrorMessage(fetchError) : null;

  if (!id) {
    return <Alert variant="error" title="Error" description="Vendor ID not found." />;
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/vendors")}>
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{vendor?.name || "Vendor Detail"}</h2>
            {vendor && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Badge variant={vendor.is_active ? "success" : "secondary"}>
                  {vendor.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{getTypeLabel(vendor.vendor_type)}</Badge>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => navigate(`/purchases?vendor=${id}`)} icon={<Icons.Cart className="w-4 h-4" />}>
          Create Purchase
        </Button>
      </div>

      {error && <Alert variant="error" title="Error" description={error} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Lifetime Purchases</div>
            <div className="text-2xl font-semibold">{formatCurrency(lifetimeValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Outstanding AP</div>
            <div className="text-2xl font-semibold">
              {outstanding === null ? "-" : formatCurrency(outstanding)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Transactions</div>
            <div className="text-2xl font-semibold">{purchases.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-medium">{vendor?.phone || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Type</div>
                <div className="font-medium">{getTypeLabel(vendor?.vendor_type)}</div>
              </div>
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-medium">{vendor?.address || "-"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle>Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purchase No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400">
                      No transactions
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/purchases/${row.id}`)}
                    >
                      <TableCell className="font-medium">{row.purchase_no || row.id}</TableCell>
                      <TableCell>{row.purchase_date || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "POSTED" ? "success" : "secondary"}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_amount || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
