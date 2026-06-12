import { useNavigate, useParams } from 'react-router-dom'
import { useVendorDetailQuery } from '../hooks/useQueries'
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

type VendorType = 'SUPPLIER' | 'KONVEKSI' | 'INTERNAL' | null | undefined

type VendorDetailProps = {
  vendorId?: string
  embedded?: boolean
  onClose?: () => void
  onOpenEdit?: (id: string) => void
}

const getTypeLabel = (type?: VendorType) => {
  switch (type) {
    case 'KONVEKSI':
      return 'Konveksi'
    case 'INTERNAL':
      return 'Internal'
    case 'SUPPLIER':
    default:
      return 'Supplier'
  }
}

export default function VendorDetail({ vendorId, embedded = false, onClose, onOpenEdit }: VendorDetailProps) {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const resolvedId = vendorId || params.id

  const { data: detailData, isLoading: loading, error: fetchError } = useVendorDetailQuery(resolvedId)

  const vendor = detailData?.vendor ?? null
  const purchases = detailData?.purchases ?? []
  const lifetimeValue = detailData?.lifetimeValue ?? 0
  const outstanding = detailData?.outstanding ?? null
  const error = fetchError ? getErrorMessage(fetchError) : null

  if (!resolvedId) {
    return <Alert variant="error" title="Error" description="Vendor ID not found." />
  }

  const handleBack = () => {
    if (onClose) {
      onClose()
      return
    }
    navigate('/vendors')
  }

  const handleEdit = () => {
    if (onOpenEdit) {
      onOpenEdit(resolvedId)
      return
    }
    navigate(`/vendors/${resolvedId}/edit`)
  }

  const actionButtons = (
    <>
      {!embedded && (
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      )}
      <Button variant="outline" onClick={handleEdit} disabled={loading || !vendor}>
        Edit
      </Button>
      <Button onClick={() => navigate(`/purchases?vendor=${resolvedId}`)} icon={<Icons.Cart className="w-4 h-4" />}>
        New Purchase
      </Button>
    </>
  )

  const metaBadges = vendor ? (
    <>
      <Badge variant={vendor.is_active ? 'success' : 'secondary'}>
        {vendor.is_active ? 'Active' : 'Inactive'}
      </Badge>
      <Badge variant="outline">{getTypeLabel(vendor.vendor_type)}</Badge>
    </>
  ) : null

  return (
    <div className="w-full space-y-6">
      {embedded ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{vendor?.name || 'Vendor Detail'}</h2>
              <p className="text-sm text-slate-600">
                {vendor ? `Profile and transaction history for ${vendor.name}.` : 'View vendor details and recent activity.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{metaBadges}</div>
          </div>
          <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">{actionButtons}</div>
        </div>
      ) : (
        <PageHeader
          title={vendor?.name || 'Vendor Detail'}
          description={vendor ? `Profile and transaction history for ${vendor.name}.` : 'View vendor details and recent activity.'}
          breadcrumbs={[
            { label: 'Vendors', href: '/vendors' },
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
            <div className="text-sm text-gray-500">Lifetime Purchases</div>
            <div className="text-2xl font-semibold">{formatCurrency(lifetimeValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Outstanding AP</div>
            <div className="text-2xl font-semibold">
              {outstanding === null ? '-' : formatCurrency(outstanding)}
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
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-medium">{vendor?.phone || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Type</div>
                <div className="font-medium">{getTypeLabel(vendor?.vendor_type)}</div>
              </div>
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-medium">{vendor?.address || '-'}</div>
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
          <ResponsiveTable minWidth="640px">
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
                      <TableCell>{row.purchase_date || '-'}</TableCell>
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
