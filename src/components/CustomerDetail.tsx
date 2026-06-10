import { useNavigate, useParams } from "react-router-dom";
import { useCustomerDetailQuery } from "../hooks/useQueries";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import { Alert } from "./ui/Alert";
import { Icons } from "./ui/Icons";
import { formatCurrency } from "../lib/format";
import { getErrorMessage } from "../lib/errors";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: detailData, isLoading: loading, error: fetchError } = useCustomerDetailQuery(id);

  const customer = detailData?.customer ?? null;
  const sales = detailData?.sales ?? [];
  const lifetimeValue = detailData?.lifetimeValue ?? 0;
  const outstanding = detailData?.outstanding ?? null;
  const error = fetchError ? getErrorMessage(fetchError) : null;

  if (!id) {
    return <Alert variant="error" title="Error" description="Customer ID not found." />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={customer?.name || "Customer Detail"}
        description={customer ? `Profile and transaction history for ${customer.name}.` : "View customer details and recent activity."}
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: "Detail" }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/customers")}>
              Back
            </Button>
            <Button onClick={() => navigate(`/sales?customer=${id}`)} icon={<Icons.Cart className="w-4 h-4" />}>
              Create Sale
            </Button>
          </div>
        }
      />

      {customer && (
        <div className="flex items-center gap-2 -mt-4 mb-4">
          <Badge variant={customer.is_active ? "success" : "secondary"}>
            {customer.is_active ? "Active" : "Inactive"}
          </Badge>
          <Badge variant={customer.customer_type === "CUSTOM" ? "warning" : "secondary"}>
            {customer.customer_type}
          </Badge>
        </div>
      )}

      {error && <Alert variant="error" title="Error" description={error} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Lifetime Sales</div>
            <div className="text-2xl font-semibold">{formatCurrency(lifetimeValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Outstanding AR</div>
            <div className="text-2xl font-semibold">
              {outstanding === null ? "-" : formatCurrency(outstanding)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Transactions</div>
            <div className="text-2xl font-semibold">{sales.length}</div>
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
                <div className="font-medium">{customer?.phone || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-medium">{customer?.address || "-"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400">
                      No transactions
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/sales/${row.id}`)}
                    >
                      <TableCell className="font-medium">{row.sales_no || row.id}</TableCell>
                      <TableCell>{row.sales_date || "-"}</TableCell>
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
