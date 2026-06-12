import { useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table'
import { Badge } from './ui/Badge'
import { CustomerBadge } from './ui/CustomerBadge'
import { Icons } from './ui/Icons'
import { type Customer } from './CustomerForm'
import { Pagination } from './ui/Pagination'
import { ResponsiveTable } from './ui/ResponsiveTable'
import { useWorkspaceSearchParams } from '../hooks/useWorkspaceSearchParams'

interface CustomerListProps {
    customers: Customer[]
    loading: boolean
    onEdit: (customer: Customer) => void
    onDelete: (id: string) => void
    onPrices: (customer: Customer) => void
    onView: (customer: Customer) => void
    onCreateSale: (customer: Customer) => void
    onPrefetch?: (id: string) => void
}

function CustomerList({ customers, loading, onEdit, onDelete, onPrices, onView, onCreateSale, onPrefetch }: CustomerListProps) {
    const { searchParams, setSearchParams } = useWorkspaceSearchParams()
    const searchTerm = searchParams.get('q') || ''
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = 15

    const filteredCustomers = useMemo(() => (
        customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.phone && c.phone.includes(searchTerm)) ||
            (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
        )
    ), [customers, searchTerm])

    const pagedCustomers = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredCustomers.slice(start, start + pageSize)
    }, [filteredCustomers, page, pageSize])

    return (
        <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Customer Directory ({filteredCustomers.length})</CardTitle>
                <div className="w-full sm:w-1/3 sm:min-w-[200px]">
                    <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={e => setSearchParams({ q: e.target.value, page: 1 })}
                        className="h-9 mb-0"
                        containerClassName="!mb-0"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ResponsiveTable minWidth="720px">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow> : pagedCustomers.map(c => (
                                <TableRow
                                    key={c.id}
                                    className={`${!c.is_active ? 'bg-gray-100 opacity-60' : ''} cursor-pointer hover:bg-slate-50`}
                                    onClick={() => onView(c)}
                                    onMouseEnter={() => onPrefetch?.(c.id)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="text-left text-slate-900">
                                            <CustomerBadge name={c.name} customerType={c.customer_type} />
                                        </div>
                                    </TableCell>
                                    <TableCell>{c.phone}</TableCell>
                                    <TableCell className="max-w-xs truncate">{c.address}</TableCell>
                                    <TableCell>
                                        <Badge variant={c.is_active ? 'success' : 'secondary'}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCreateSale(c);
                                                }}
                                                className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600"
                                            >
                                                <Icons.Cart className="w-[20px] h-[20px]" />
                                            </Button>
                                            {c.customer_type === 'CUSTOM' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPrices(c);
                                                    }}
                                                    className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600"
                                                >
                                                    <Icons.Tag className="w-[20px] h-[20px]" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(c);
                                                }}
                                                className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600"
                                            >
                                                <Icons.Edit className="w-[22px] h-[22px]" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(c.id);
                                                }}
                                                className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600"
                                            >
                                                <Icons.Trash className="w-[22px] h-[22px]" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ResponsiveTable>
                <Pagination
                    currentPage={page}
                    totalCount={filteredCustomers.length}
                    pageSize={pageSize}
                    onPageChange={(nextPage) => setSearchParams({ page: nextPage })}
                    isLoading={loading}
                />
            </CardContent>
        </Card >
    )
}

export default memo(CustomerList)
