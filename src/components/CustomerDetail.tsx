import { useNavigate, useParams } from 'react-router-dom'
import { useCustomerDetailQuery } from '../hooks/useQueries'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { PageHeader } from './ui/PageHeader'
import { Badge } from './ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table'
import { Alert } from './ui/Alert'
import { Icons } from './ui/Icons'
import { ResponsiveTable } from './ui/ResponsiveTable'
import { formatCurrency } from '../lib/format'
import { getErrorMessage } from '../lib/errors'

type CustomerDetailProps = {
  customerId?: string
  embedded?: boolean
  onClose?: () => void
  onOpenEdit?: (id: string) => void
  onOpenPricing?: (id: string) => void
}

function getCustomerTypeLabel(type?: string) {
  switch (type) {
    case 'KHUSUS':
      return 'Special'
    case 'CUSTOM':
      return 'Custom'
    case 'UMUM':
    default:
      return 'General'
  }
}

export default function CustomerDetail({
  customerId,
  embedded = false,
  onClose,
  onOpenEdit,
  onOpenPricing,
}: CustomerDetailProps) {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const resolvedId = customerId || params.id

  const { data: detailData, isLoading: loading, error: fetchError } = useCustomerDetailQuery(resolvedId)

  const customer = detailData?.customer ?? null
  const sales = detailData?.sales ?? []
  const lifetimeValue = detailData?.lifetimeValue ?? 0
  const outstanding = detailData?.outstanding ?? null
  const error = fetchError ? getErrorMessage(fetchError) : null

  if (!resolvedId) {
    return <Alert variant="error" title="Error" description="Customer ID not found." />
  }

  const handleBack = () => {
    if (onClose) {
      onClose()
      return
    }
    navigate('/customers')
  }

  const handleEdit = () => {
    if (onOpenEdit) {
      onOpenEdit(resolvedId)
      return
    }
    navigate(`/customers/${resolvedId}/edit`)
  }

  const handleOpenPricing = () => {
    if (onOpenPricing) {
      onOpenPricing(resolvedId)
      return
    }
    navigate(`/customers/${resolvedId}/pricing`)
  }

  const actionButtons = (
    <>
      {!embedded && (
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      )}
      <Button variant="outline" onClick={handleEdit} disabled={loading || !customer}>
        Edit
      </Button>
      {customer?.customer_type === 'CUSTOM' && (
        <Button variant="outline" onClick={handleOpenPricing} disabled={loading}>
          Pricing
        </Button>
      )}
      <Button onClick={() => navigate(`/sales?customer=${resolvedId}`)} icon={<Icons.Cart className="w-4 h-4" />}>
        New Sale
      </Button>
    </>
  )

  const metaBadges = customer ? (
    <>
      <Badge variant={customer.is_active ? 'success' : 'secondary'}>
        {customer.is_active ? 'Active' : 'Inactive'}
      </Badge>
      <Badge variant={customer.customer_type === 'CUSTOM' ? 'warning' : 'secondary'}>
        {getCustomerTypeLabel(customer.customer_type)}
      </Badge>
    </>
  ) : null

  return (
    <div className="w-full space-y-6">
      {embedded ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{customer?.name || 'Customer Detail'}</h2>
              <p className="text-sm text-slate-600">
                {customer ? `Profile and transaction history for ${customer.name}.` : 'View customer details and recent activity.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{metaBadges}</div>
          </div>
          <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">{actionButtons}</div>
        </div>
      ) : (
        <PageHeader
          title={customer?.name || 'Customer Detail'}
          description={customer ? `Profile and transaction history for ${customer.name}.` : 'View customer details and recent activity.'}
          breadcrumbs={[
            { label: 'Customers', href: '/customers' },
            { label: 'Detail' },
          ]}
          meta={metaBadges}
          actions={actionButtons}
        />
      )}

      {error && <Alert variant="error" title="Error" description={error} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              {outstanding === null ? '-' : formatCurrency(outstanding)}
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
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-medium">{customer?.phone || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-medium">{customer?.address || '-'}</div>
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
          <ResponsiveTable minWidth="640px">
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
                      <TableCell>{row.sales_date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'POSTED' ? 'success' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_amount || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  )
}
