import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { itemQueryKeys, useItemDetailQuery, useQueryClient } from '../hooks/useQueries'
import { ITEM_TYPES } from '../lib/constants'
import { formatCurrency } from '../lib/format'
import { getErrorMessage } from '../lib/errors'
import { Alert } from './ui/Alert'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { PageHeader } from './ui/PageHeader'
import { ResponsiveTable } from './ui/ResponsiveTable'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table'

type ItemDetailProps = {
  itemId?: string
  embedded?: boolean
  onClose?: () => void
  onOpenEdit?: (id: string) => void
}

function getTypeLabel(type?: string) {
  switch (type) {
    case ITEM_TYPES.FINISHED_GOOD:
      return 'Finished Good'
    case ITEM_TYPES.RAW_MATERIAL:
      return 'Raw Material'
    case ITEM_TYPES.TRADED:
      return 'Traded'
    default:
      return type || '-'
  }
}

export default function ItemDetail({ itemId, embedded = false, onClose, onOpenEdit }: ItemDetailProps) {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const resolvedItemId = itemId || params.id

  const { data, isLoading, error } = useItemDetailQuery(resolvedItemId)
  const item = data?.item ?? null
  const bomItems = data?.bomItems ?? []
  const errorMessage = error ? getErrorMessage(error) : null

  const metaBadges = useMemo(() => {
    if (!item) return null

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.is_active ? 'success' : 'secondary'}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant="outline">{getTypeLabel(item.type)}</Badge>
        {item.uom_detail?.code && <Badge variant="secondary">{item.uom_detail.code}</Badge>}
      </div>
    )
  }, [item])

  if (!resolvedItemId) {
    return <Alert variant="error" title="Error" description="Item ID not found." />
  }

  const handleOpenEdit = () => {
    if (!resolvedItemId) return
    if (onOpenEdit) {
      onOpenEdit(resolvedItemId)
      return
    }
    navigate(`/items/${resolvedItemId}/edit`)
  }

  const handleBack = () => {
    if (onClose) {
      onClose()
      return
    }
    navigate('/items')
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: itemQueryKeys.detail(resolvedItemId) })
  }

  return (
    <div className="w-full space-y-6 pb-2">
      {embedded ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{item?.name || 'Item Detail'}</h2>
              <p className="text-sm text-slate-600">View pricing, attributes, and bill of materials.</p>
            </div>
            {metaBadges}
          </div>
          <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              Refresh
            </Button>
            <Button onClick={handleOpenEdit} disabled={!item || isLoading}>
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <PageHeader
          title={item?.name || 'Item Detail'}
          description="View pricing, attributes, and bill of materials."
          breadcrumbs={[
            { label: 'Items', href: '/items' },
            { label: 'Detail' },
          ]}
          meta={metaBadges}
          actions={
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                Refresh
              </Button>
              <Button onClick={handleOpenEdit} disabled={!item || isLoading}>
                Edit
              </Button>
            </>
          }
        />
      )}

      {errorMessage && <Alert variant="error" title="Error" description={errorMessage} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Default Price</div>
            <div className="text-2xl font-semibold text-slate-900">{formatCurrency(item?.price_default || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Special Price</div>
            <div className="text-2xl font-semibold text-slate-900">{formatCurrency(item?.price_khusus || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Buy Price</div>
            <div className="text-2xl font-semibold text-slate-900">{formatCurrency(item?.default_price_buy || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-slate-500">SKU</div>
                <div className="font-medium text-slate-900">{item?.sku || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Brand</div>
                <div className="font-medium text-slate-900">{item?.brand?.name || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Category</div>
                <div className="font-medium text-slate-900">{item?.category?.name || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">UoM</div>
                <div className="font-medium text-slate-900">{item?.uom_detail?.code || item?.uom_detail?.name || item?.uom || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Size</div>
                <div className="font-medium text-slate-900">{item?.size?.code || item?.size?.name || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Color</div>
                <div className="font-medium text-slate-900">{item?.color?.code || item?.color?.name || '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">Minimum Stock</div>
                <div className="font-medium text-slate-900">{item?.min_stock ?? 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {item?.type === ITEM_TYPES.FINISHED_GOOD && (
        <Card>
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle>Bill of Materials</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveTable minWidth="640px">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raw Material</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Qty per FG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                        Loading BOM...
                      </TableCell>
                    </TableRow>
                  ) : bomItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                        No BOM lines yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bomItems.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-slate-900">{row.raw_material?.name || '-'}</TableCell>
                        <TableCell>{row.raw_material?.sku || '-'}</TableCell>
                        <TableCell>{row.raw_material?.uom || '-'}</TableCell>
                        <TableCell className="text-right">{row.qty_per_fg}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
