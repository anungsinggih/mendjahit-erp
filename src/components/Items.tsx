import { useEffect, useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table'
import { Icons } from './ui/Icons'
import { useConfirm } from './ui/ConfirmDialogContext'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog'
import ItemForm from './ItemForm'
import { ItemImportDialog } from './ItemImportDialog'
import { usePagination } from '../hooks/usePagination'
import { useDebounce } from '../hooks/useDebounce'
import { Pagination } from './ui/Pagination'
import { PageHeader } from './ui/PageHeader'
import { Section } from './ui/Section'
import { ResponsiveTable } from './ui/ResponsiveTable'
import { getErrorMessage } from '../lib/errors'
import { useItemsQuery } from '../hooks/useQueries'
import * as XLSX from 'xlsx'

import type { Item } from "../types/shared";
import { ITEM_TYPES, type ItemType } from "../lib/constants";

type ItemRowProps = {
    item: Item
    onEdit: (item: Item) => void
    onDelete: (id: string) => void
}

const ItemRow = memo(({ item, onEdit, onDelete }: ItemRowProps) => (
    <TableRow className="hover:bg-slate-50/80 transition-colors">
        <TableCell className="font-mono text-xs font-semibold text-slate-600">{item.sku}</TableCell>
        <TableCell>
            <div className="font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">{item.name}</div>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-1 mt-1">
                {item.brand && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{item.brand.name}</span>}
                {item.category && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{item.category.name}</span>}
                {item.uom_detail && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">{item.uom_detail.code}</span>}
            </div>
        </TableCell>
        <TableCell className="text-xs text-slate-600">
            {item.size ? (item.size.code || item.size.name) : <span className="text-slate-300">-</span>}
        </TableCell>
        <TableCell className="text-xs text-slate-600">
            {item.color ? (item.color.code || item.color.name) : <span className="text-slate-300">-</span>}
        </TableCell>
        <TableCell>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide
            ${item.type === 'FINISHED_GOOD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    item.type === 'TRADED' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                {item.type === 'FINISHED_GOOD' ? 'FG' :
                    item.type === 'TRADED' ? 'TD' : 'RM'}
            </span>
        </TableCell>
        <TableCell className="text-right">
            <div className="text-sm font-medium text-slate-700">{item.price_default.toLocaleString()}</div>
        </TableCell>
        <TableCell className="text-right">
            <div className="text-sm text-slate-500">{item.price_khusus.toLocaleString()}</div>
        </TableCell>
        <TableCell className="text-center">
            {item.is_active
                ? <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto ring-4 ring-emerald-50" title="Active"></div>
                : <div className="w-2 h-2 rounded-full bg-slate-300 mx-auto" title="Inactive"></div>
            }
        </TableCell>
        <TableCell className="text-right">
            <div className="flex justify-end gap-1">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(item)}
                    className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600"
                >
                    <Icons.Edit className="w-[22px] h-[22px]" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item.id)}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600"
                >
                    <Icons.Trash className="w-[22px] h-[22px]" />
                </Button>
            </div>
        </TableCell>
    </TableRow>
))

ItemRow.displayName = 'ItemRow'

export default function Items() {
    const navigate = useNavigate()

    // Form State
    const [editingItem, setEditingItem] = useState<Item | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const { confirm } = useConfirm()
    const [isExporting, setIsExporting] = useState(false)

    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 400)
    const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all')

    const { page, setPage, pageSize, range } = usePagination();
    const { data, isLoading, isFetching, error: fetchError, refetch } = useItemsQuery({
        range,
        search: debouncedSearch,
        typeFilter
    })

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [debouncedSearch, typeFilter, setPage])

    const filteredItems = data?.items || []
    const totalCount = data?.count || 0
    const loading = isLoading || isFetching
    const fetchErrorMessage = fetchError ? getErrorMessage(fetchError) : null

    const handleExportXlsx = useCallback(async () => {
        setIsExporting(true)
        try {
            const batchSize = 1000
            let from = 0
            const exportItems: Item[] = []

            while (true) {
                let query = supabase
                    .from("items")
                    .select(
                        `
                        *,
                        brand:brands(name),
                        category:categories(name),
                        uom_detail:uoms(name, code),
                        size:sizes(name, code),
                        color:colors(name, code)
                    `
                    )

                if (debouncedSearch) {
                    query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`)
                }

                if (typeFilter !== "all") {
                    query = query.eq("type", typeFilter)
                }

                const { data, error } = await query
                    .order("sku", { ascending: true })
                    .range(from, from + batchSize - 1)

                if (error) throw error

                const batch = (data || []) as Item[]
                exportItems.push(...batch)

                if (batch.length < batchSize) break
                from += batchSize
            }

            if (exportItems.length === 0) {
                await confirm({
                    title: "No Data",
                    description: "No product variants found for current filters.",
                    confirmText: "OK",
                    hideCancel: true,
                })
                return
            }

            const exportRows = exportItems.map((item, index) => ({
                No: index + 1,
                SKU: item.sku,
                Name: item.name,
                Brand: item.brand?.name || "",
                Category: item.category?.name || "",
                UOM: item.uom_detail?.code || item.uom_detail?.name || "",
                Size: item.size?.code || item.size?.name || "",
                Color: item.color?.code || item.color?.name || "",
                Type: item.type,
                Price_Umum: Number(item.price_default || 0),
                Price_Khusus: Number(item.price_khusus || 0),
                Active: item.is_active ? "YES" : "NO",
            }))

            const worksheet = XLSX.utils.json_to_sheet(exportRows)
            worksheet["!cols"] = [
                { wch: 6 },
                { wch: 18 },
                { wch: 36 },
                { wch: 18 },
                { wch: 18 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 16 },
                { wch: 14 },
                { wch: 14 },
                { wch: 10 },
            ]

            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "ProductVariants")

            const dateStamp = new Date().toISOString().slice(0, 10)
            XLSX.writeFile(workbook, `product_variants_${dateStamp}.xlsx`)
        } catch (err) {
            await confirm({
                title: "Export Failed",
                description: getErrorMessage(err, "Failed to export product variants."),
                confirmText: "OK",
                hideCancel: true,
            })
        } finally {
            setIsExporting(false)
        }
    }, [confirm, debouncedSearch, typeFilter])


    function handleSuccess() {
        setEditingItem(null)
        setIsModalOpen(false)
        refetch()
    }

    const handleEdit = useCallback((item: Item) => {
        // Shared item has type: string, but component might expect specific union for editing logic
        // We can cast or just pass it as is if Form accepts string or Item
        setEditingItem(item)
        setIsModalOpen(true)
    }, [])

    function handleAddItem() {
        setEditingItem(null)
        setIsModalOpen(true)
    }

    function handleImportSuccess() {
        refetch()
    }

    const handleDelete = useCallback(async (id: string) => {
        const ok = await confirm({
            title: "Delete Item",
            description: "Are you sure you want to delete this item?",
            confirmText: "Delete",
            cancelText: "Cancel",
            tone: "danger",
        })
        if (!ok) return
        const { error } = await supabase.from('items').delete().eq('id', id)
        if (error) {
            void confirm({
                title: "Cannot Delete",
                description: "Could not delete (referenced). Try deactivating.",
                confirmText: "OK",
                hideCancel: true,
            })
        }
        else refetch()
    }, [confirm, refetch])

    return (
        <div className="w-full space-y-6 pb-20">
            <PageHeader
                title="Items Management"
                description="Manage your product inventory, master data, and pricing."
                breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Items" }]}
                actions={
                    <div className="flex gap-2">
                        <Button
                            onClick={handleExportXlsx}
                            variant="outline"
                            icon={<Icons.Download className="w-4 h-4" />}
                            isLoading={isExporting}
                            className="w-auto"
                        >
                            Export XLSX
                        </Button>
                        <Button
                            onClick={() => setIsImportOpen(true)}
                            variant="outline"
                            icon={<Icons.Upload className="w-4 h-4" />}
                            className="w-auto"
                        >
                            Import
                        </Button>
                        <Button
                            onClick={handleAddItem}
                            icon={<Icons.Plus className="w-4 h-4" />}
                            className="bg-indigo-600 hover:bg-indigo-700 w-auto"
                        >
                            Add Item
                        </Button>
                    </div>
                }
            />



            {fetchErrorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative flex items-center gap-2">
                    <Icons.Warning className="w-5 h-5 flex-shrink-0" /> {fetchErrorMessage}
                </div>
            )}

            <Section
                title={`Item List (${totalCount})`}
                description="View and filter all registered items."
                className="min-h-[500px]"
                action={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Icons.Settings className="w-4 h-4" />}
                            onClick={() => navigate('/attributes')}
                        >
                            Attributes
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Icons.Tag className="w-4 h-4" />}
                            onClick={() => navigate('/brands-categories')}
                        >
                            Brands & Categories
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                        <div className="w-full sm:w-64 relative">
                            <Input
                                placeholder="Search by name or SKU..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9"
                                containerClassName="!mb-0"
                            />
                            <Icons.Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="flex bg-slate-100/80 p-1 rounded-lg">
                            {[
                                { label: 'All', value: 'all' as const },
                                { label: 'Finished Goods', value: ITEM_TYPES.FINISHED_GOOD },
                                { label: 'Traded', value: ITEM_TYPES.TRADED },
                                { label: 'Raw Material', value: ITEM_TYPES.RAW_MATERIAL },
                            ].map(tab => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setTypeFilter(tab.value)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === tab.value ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <ResponsiveTable minWidth="900px">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-indigo-100/50">
                                    <TableHead className="w-[100px] text-xs uppercase tracking-wider text-slate-500">SKU</TableHead>
                                    <TableHead className="min-w-[200px] text-xs uppercase tracking-wider text-slate-500">Name / Variant</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-slate-500">Size</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-slate-500">Color</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-slate-500">Type</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-slate-500">Price (Umum)</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-slate-500">Price (Khusus)</TableHead>
                                    <TableHead className="text-center text-xs uppercase tracking-wider text-slate-500">Active</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-slate-500">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                                <span>Loading inventory...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center italic py-12 text-slate-500">
                                            No items found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map(item => (
                                        <ItemRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                                    )))}
                            </TableBody>
                        </Table>
                    </ResponsiveTable>


                    {!loading && filteredItems.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                            <Pagination
                                currentPage={page}
                                totalCount={totalCount}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                isLoading={loading}
                            />
                        </div>
                    )}
                </div>
            </Section>

            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle>
                </DialogHeader>
                <DialogContent>
                    <ItemForm
                        existingItem={editingItem}
                        onSuccess={handleSuccess}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <ItemImportDialog
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={handleImportSuccess}
            />
        </div>
    )
}
