import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table'
import { Button } from './ui/Button'
import { Icons } from './ui/Icons'
import { EmptyState } from './ui/EmptyState'
import { StatusBadge } from './ui/StatusBadge'
import { formatCurrency, formatDate } from '../lib/format'
import { usePurchaseReturnHistoryQuery, prefetchPurchaseReturnDetail, useQueryClient } from '../hooks/useQueries'
import { usePagination } from '../hooks/usePagination'
import { Pagination } from './ui/Pagination'
import { PageHeader } from './ui/PageHeader'

export default function PurchaseReturnHistory() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data, isLoading, isFetching, error: fetchError, refetch } = usePurchaseReturnHistoryQuery()

    const returns = useMemo(() => data || [], [data])
    const loading = isLoading || isFetching
    const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : fetchError ? 'Failed to fetch purchase returns' : null

    const { page, setPage, pageSize, range } = usePagination({ defaultPageSize: 15 })

    useEffect(() => {
        setPage(1)
    }, [returns.length, setPage])

    const pagedReturns = useMemo(
        () => returns.slice(range[0], range[1] + 1),
        [returns, range]
    )

    if (loading) {
        return (
            <div className="w-full p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading purchase returns...</p>
            </div>
        )
    }

    return (
        <div className="w-full space-y-6">
            <PageHeader
                title="Purchase Return History"
                description="Track all items returned to suppliers, document statuses, and balance adjustments."
                actions={
                    <div className="flex gap-2">
                        <Button onClick={() => refetch()} variant="outline" size="icon" icon={<Icons.Refresh className={`w-4 h-4 ${isFetching && !isLoading ? 'animate-spin' : ''}`} />} title="Refresh" />
                        <Button onClick={() => navigate('/purchase-return')} icon={<Icons.Plus className="w-4 h-4" />}>
                            New Return
                        </Button>
                    </div>
                }
            />

            {fetchErrorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2">
                    <Icons.Warning className="w-5 h-5" /> {fetchErrorMessage}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>All Purchase Return Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {returns.length === 0 ? (
                        <EmptyState
                            icon={<Icons.FileText className="w-5 h-5" />}
                            title="No purchase return documents found"
                            description="Create your first return to get started"
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Return Date</TableHead>
                                        <TableHead>Return No</TableHead>
                                        <TableHead>Original Purchase</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pagedReturns.map((ret) => (
                                        <TableRow
                                            key={ret.id}
                                            className="cursor-pointer hover:bg-slate-50"
                                            onClick={() => navigate(`/purchase-returns/${ret.id}`)}
                                            onMouseEnter={() => prefetchPurchaseReturnDetail(queryClient, ret.id)}
                                        >
                                            <TableCell>{formatDate(ret.return_date)}</TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {ret.return_no}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {ret.purchase_no}
                                            </TableCell>
                                            <TableCell>{ret.vendor_name}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(ret.total_amount)}
                                            </TableCell>
                                            <TableCell><StatusBadge status={ret.status} /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {ret.status === 'DRAFT' && (
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigate(`/purchase-return?draft=${ret.id}`)
                                                            }}
                                                            icon={<Icons.Edit className="w-4 h-4" />}
                                                            aria-label="Edit return"
                                                            title="Edit"
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <Pagination
                        currentPage={page}
                        totalCount={returns.length}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        isLoading={loading}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
