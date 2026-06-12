import { useEffect, useState, useCallback, useMemo, memo } from 'react'
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
import ItemDetail from './ItemDetail'
import VendorItemManager from './VendorItemManager'
import { Pagination } from './ui/Pagination'
import { PageHeader } from './ui/PageHeader'
import { Section } from './ui/Section'
import { ResponsiveTable } from './ui/ResponsiveTable'
import { getErrorMessage } from '../lib/errors'
import { itemQueryKeys, prefetchItemDetail, useItemsQuery, useQueryClient } from '../hooks/useQueries'
import { useWorkspaceSearchParams } from '../hooks/useWorkspaceSearchParams'
import { useRouteModal } from '../hooks/useRouteModal'
import { WorkspaceOverlayShell } from './ui/WorkspaceOverlayShell'
// xlsx is loaded dynamically only when export is triggered

import type { Item } from "../types/shared";
import { ITEM_TYPES, type ItemType } from "../lib/constants";

function formatItemPrice(value: unknown) {
    const normalizedValue = Number(value)
    return Number.isFinite(normalizedValue)
        ? normalizedValue.toLocaleString('id-ID')
        : '0'
}

type ItemRowProps = {
    item: Item
    onOpen?: (id: string) => void
    onPrefetch?: (id: string) => void
    onEdit: (item: Item) => void
    onDelete: (id: string) => void
    onOpenVendorItems?: (item: Item) => void
    isSelected: boolean
    isSelectable: boolean
    onToggleSelect: (id: string) => void
}

const ItemRow = memo(({ item, onOpen, onPrefetch, onEdit, onDelete, onOpenVendorItems, isSelected, isSelectable, onToggleSelect }: ItemRowProps) => (
    <TableRow className="group cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => onOpen?.(item.id)} onMouseEnter={() => onPrefetch?.(item.id)}>
        <TableCell className="w-12">
            <input
                type="checkbox"
                checked={isSelected}
                disabled={!isSelectable}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`Select ${item.name}`}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            />
        </TableCell>
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
            <div className="text-sm font-medium text-slate-700">{formatItemPrice(item.price_default)}</div>
        </TableCell>
        <TableCell className="text-right">
            <div className="text-sm text-slate-500">{formatItemPrice(item.price_khusus)}</div>
        </TableCell>
        <TableCell className="text-center">
            {item.is_active
                ? <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto ring-4 ring-emerald-50" title="Active"></div>
                : <div className="w-2 h-2 rounded-full bg-slate-300 mx-auto" title="Inactive"></div>
            }
        </TableCell>
        <TableCell className="text-right">
            <div className="flex justify-end gap-1">
                {onOpenVendorItems && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onOpenVendorItems(item) }}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-amber-600"
                    title="Supplier Cost"
                >
                    <Icons.Tag className="w-[18px] h-[18px]" />
                </Button>
                )}
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onEdit(item) }}
                    className="h-9 w-9 p-0 text-slate-500 hover:text-indigo-600"
                    title="Edit Item"
                >
                    <Icons.Edit className="w-[22px] h-[22px]" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
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
    const queryClient = useQueryClient()
    const { confirm } = useConfirm()
    const { searchParams, setSearchParams } = useWorkspaceSearchParams()
    const { isOpen, modal, id, openModal, replaceModal, closeModal } = useRouteModal()

    const [vendorItemItemId, setVendorItemItemId] = useState<string | null>(null)
    const [vendorItemItemName, setVendorItemItemName] = useState('')
    const [isExporting, setIsExporting] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false)
    const [batchPriceValue, setBatchPriceValue] = useState('')
    const [batchPriceError, setBatchPriceError] = useState<string | null>(null)
    const [isBatchSaving, setIsBatchSaving] = useState(false)

    const searchTerm = searchParams.get('q') || ''
    const rawTypeFilter = searchParams.get('type') || 'all'
    const typeFilter = (['all', ...Object.values(ITEM_TYPES)] as string[]).includes(rawTypeFilter)
        ? rawTypeFilter as ItemType | 'all'
        : 'all'
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = 15
    const { data: allItems, isLoading, isFetching, error: fetchError, refetch } = useItemsQuery({ typeFilter })

    // Client-side search + pagination
    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return allItems ?? []
        const term = searchTerm.toLowerCase()
        return (allItems ?? []).filter(item =>
            item.name?.toLowerCase().includes(term) ||
            item.sku?.toLowerCase().includes(term)
        )
    }, [allItems, searchTerm])

    const totalCount = filteredItems.length
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredItems.slice(start, start + pageSize)
    }, [filteredItems, page, pageSize])

    // Reset page when filters change
    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredItems.length / pageSize))
        if (page > maxPage) {
            setSearchParams({ page: maxPage })
        }
    }, [filteredItems.length, page, pageSize, setSearchParams])
    const loading = isLoading || isFetching
    const fetchErrorMessage = fetchError ? getErrorMessage(fetchError) : null
    const isBatchPriceEligible = (item: Item) =>
        item.type === ITEM_TYPES.FINISHED_GOOD || item.type === ITEM_TYPES.TRADED
    const eligibleVisibleItems = useMemo(
        () => filteredItems.filter(isBatchPriceEligible),
        [filteredItems]
    )
    const eligibleVisibleIds = useMemo(
        () => eligibleVisibleItems.map(item => item.id),
        [eligibleVisibleItems]
    )
    const selectedEligibleItems = useMemo(
        () => eligibleVisibleItems.filter(item => selectedItemIds.includes(item.id)),
        [eligibleVisibleItems, selectedItemIds]
    )
    const allEligibleVisibleSelected =
        eligibleVisibleIds.length > 0 &&
        eligibleVisibleIds.every(id => selectedItemIds.includes(id))
    const selectedItem = useMemo(
        () => (allItems ?? []).find(item => item.id === id) ?? null,
        [allItems, id],
    )
    const overlayTitle = modal === 'item.edit'
        ? 'Edit Item'
        : modal === 'item.detail'
            ? 'Item Detail'
            : modal === 'item.import'
                ? 'Import Items'
                : 'New Item'
    const overlayDescription = modal === 'item.import'
        ? 'Upload spreadsheet file and preview item data before import.'
        : modal === 'item.detail'
            ? 'Review item pricing, attributes, and bill of materials.'
            : 'Manage item master data without leaving workspace.'
    const overlaySize = modal === 'item.import'
        ? 'wide'
        : modal === 'item.detail'
            ? 'wide'
            : 'xwide'

    useEffect(() => {
        const visibleEligibleIds = new Set(eligibleVisibleIds)
        setSelectedItemIds(prev => {
            const nextSelectedIds = prev.filter(id => visibleEligibleIds.has(id))
            return nextSelectedIds.length === prev.length ? prev : nextSelectedIds
        })
    }, [eligibleVisibleIds])

    const handleOpenVendorItems = useCallback((item: Item) => {
        setVendorItemItemId(item.id)
        setVendorItemItemName(item.name)
    }, [])

    const handlePrefetch = useCallback((itemId: string) => {
        prefetchItemDetail(queryClient, itemId)
    }, [queryClient])

    const handleExportXlsx = useCallback(async () => {
        setIsExporting(true)
        try {
            // Export uses already-filtered client-side data (no extra DB call needed)
            const exportItems = filteredItems

            if (exportItems.length === 0) {
                await confirm({
                    title: "No Data",
                    description: "No product variants found for current filters.",
                    confirmText: "OK",
                    hideCancel: true,
                })
                return
            }

            const XLSX = await import('xlsx')

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
                Price_Default: Number(item.price_default || 0),
                Price_Special: Number(item.price_khusus || 0),
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
    }, [confirm, filteredItems])


    const handleSuccess = useCallback(async (savedId: string) => {
        await refetch()
        queryClient.invalidateQueries({ queryKey: itemQueryKeys.all })
        queryClient.invalidateQueries({ queryKey: itemQueryKeys.detailRoot })
        replaceModal({ modal: 'item.detail', values: { id: savedId } })
    }, [queryClient, refetch, replaceModal])

    const handleEdit = useCallback((item: Item) => {
        openModal({ modal: 'item.edit', values: { id: item.id } })
    }, [openModal])

    const handleAddItem = useCallback(() => {
        openModal({ modal: 'item.create' })
    }, [openModal])

    const handleOpenDetail = useCallback((itemId: string) => {
        openModal({ modal: 'item.detail', values: { id: itemId } })
    }, [openModal])

    const handleImportSuccess = useCallback(async () => {
        await refetch()
        queryClient.invalidateQueries({ queryKey: itemQueryKeys.all })
    }, [queryClient, refetch])

    const handleToggleItemSelection = useCallback((id: string) => {
        setSelectedItemIds(prev =>
            prev.includes(id)
                ? prev.filter(existingId => existingId !== id)
                : [...prev, id]
        )
    }, [])

    const handleToggleSelectAllVisible = useCallback(() => {
        setSelectedItemIds(prev => {
            if (allEligibleVisibleSelected) {
                return prev.filter(id => !eligibleVisibleIds.includes(id))
            }

            return Array.from(new Set([...prev, ...eligibleVisibleIds]))
        })
    }, [allEligibleVisibleSelected, eligibleVisibleIds])

    const handleOpenBatchPriceModal = useCallback(async () => {
        if (selectedEligibleItems.length === 0) {
            await confirm({
                title: "No Items Selected",
                description: "Select one or more Finished Goods or Traded items first.",
                confirmText: "OK",
                hideCancel: true,
            })
            return
        }

        setBatchPriceValue('')
        setBatchPriceError(null)
        setIsBatchPriceModalOpen(true)
    }, [confirm, selectedEligibleItems.length])

    const handleBatchPriceSave = useCallback(async () => {
        const nextPrice = Number(batchPriceValue)
        if (batchPriceValue.trim() === '' || Number.isNaN(nextPrice) || nextPrice < 0) {
            setBatchPriceError('Enter a valid Default Price value.')
            return
        }

        if (selectedEligibleItems.length === 0) {
            setBatchPriceError('No eligible items selected.')
            return
        }

        setIsBatchSaving(true)
        setBatchPriceError(null)

        try {
            const { error } = await supabase
                .from('items')
                .update({ price_default: nextPrice })
                .in('id', selectedEligibleItems.map(item => item.id))

            if (error) throw error

            setIsBatchPriceModalOpen(false)
            setSelectedItemIds([])
            await refetch()
            queryClient.invalidateQueries({ queryKey: itemQueryKeys.all })
            await confirm({
                title: "Batch Update Success",
                description: `Updated Default Price for ${selectedEligibleItems.length} items to ${nextPrice.toLocaleString('id-ID')}.`,
                confirmText: "OK",
                hideCancel: true,
            })
        } catch (err) {
            setBatchPriceError(getErrorMessage(err, 'Failed to update Default Price.'))
        } finally {
            setIsBatchSaving(false)
        }
    }, [batchPriceValue, confirm, queryClient, refetch, selectedEligibleItems])

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
        else {
            await refetch()
            queryClient.invalidateQueries({ queryKey: itemQueryKeys.all })
            queryClient.invalidateQueries({ queryKey: itemQueryKeys.detail(id) })
        }
    }, [confirm, queryClient, refetch])

    return (
        <div className="w-full space-y-6 pb-20">
            <PageHeader
                title="Items"
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
                            onClick={() => openModal({ modal: 'item.import' })}
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
                            New Item
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
                title={`Item Catalog (${totalCount})`}
                description="View and filter all registered items."
                className="min-h-[500px]"
                action={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Icons.Tag className="w-4 h-4" />}
                            onClick={() => setSelectedItemIds([])}
                            disabled={selectedItemIds.length === 0}
                        >
                            Clear Selected
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Icons.Edit className="w-4 h-4" />}
                            onClick={handleOpenBatchPriceModal}
                            disabled={selectedEligibleItems.length === 0}
                        >
                            Batch Update Default Price
                        </Button>
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
                                onChange={e => setSearchParams({ q: e.target.value, page: 1 })}
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
                                    onClick={() => setSearchParams({ type: tab.value, page: 1 })}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === tab.value ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="font-semibold">{selectedEligibleItems.length}</span> item selected for batch default price update.
                        </div>
                        <div className="text-xs text-indigo-700">
                            Quick version only applies to item rows you check on this page, and skips RAW_MATERIAL.
                        </div>
                    </div>

                    <ResponsiveTable minWidth="900px">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-indigo-100/50">
                                    <TableHead className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={allEligibleVisibleSelected}
                                            disabled={eligibleVisibleIds.length === 0}
                                            onChange={handleToggleSelectAllVisible}
                                            aria-label="Select all visible items"
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[100px] text-xs uppercase tracking-wider text-slate-500">SKU</TableHead>
                                    <TableHead className="min-w-[140px] sm:min-w-[200px] text-xs uppercase tracking-wider text-slate-500">Name / Variant</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-slate-500">Size</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-slate-500">Color</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-slate-500">Type</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-slate-500">Default Price</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-slate-500">Special Price</TableHead>
                                    <TableHead className="text-center text-xs uppercase tracking-wider text-slate-500">Active</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-slate-500">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                                <span>Loading inventory...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center italic py-12 text-slate-500">
                                            No items found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedItems.map(item => (
                                        <ItemRow
                                            key={item.id}
                                            item={item}
                                            onOpen={handleOpenDetail}
                                            onPrefetch={handlePrefetch}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onOpenVendorItems={handleOpenVendorItems}
                                            isSelected={selectedItemIds.includes(item.id)}
                                            isSelectable={isBatchPriceEligible(item)}
                                            onToggleSelect={handleToggleItemSelection}
                                        />
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
                                onPageChange={(nextPage) => setSearchParams({ page: nextPage })}
                                isLoading={loading}
                            />
                        </div>
                    )}
                </div>
            </Section>

            <WorkspaceOverlayShell
                isOpen={isOpen}
                onClose={closeModal}
                title={overlayTitle}
                description={overlayDescription}
                size={overlaySize}
            >
                {modal === 'item.create' && (
                    <ItemForm
                        onSuccess={handleSuccess}
                        onCancel={closeModal}
                    />
                )}

                {modal === 'item.edit' && id && (
                    <ItemForm
                        itemId={id}
                        existingItem={selectedItem}
                        onSuccess={handleSuccess}
                        onCancel={closeModal}
                    />
                )}

                {modal === 'item.detail' && id && (
                    <ItemDetail
                        itemId={id}
                        embedded
                        onClose={closeModal}
                        onOpenEdit={(itemId) => replaceModal({ modal: 'item.edit', values: { id: itemId } })}
                    />
                )}

                {modal === 'item.import' && (
                    <ItemImportDialog
                        embedded
                        onClose={closeModal}
                        onSuccess={handleImportSuccess}
                    />
                )}
            </WorkspaceOverlayShell>

            <Dialog
                isOpen={isBatchPriceModalOpen}
                onClose={() => !isBatchSaving && setIsBatchPriceModalOpen(false)}
                contentClassName="max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>Batch Update Default Price</DialogTitle>
                </DialogHeader>
                <DialogContent>
                    <div className="space-y-4">
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
                            Applying one default price value to <span className="font-semibold">{selectedEligibleItems.length}</span> selected items on this page.
                        </div>

                        <Input
                            label="New Default Price"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            placeholder="Enter new selling price"
                            value={batchPriceValue}
                            onChange={(e) => {
                                setBatchPriceValue(e.target.value)
                                if (batchPriceError) setBatchPriceError(null)
                            }}
                            containerClassName="!mb-0"
                        />

                        {batchPriceError && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {batchPriceError}
                            </div>
                        )}

                        <div className="rounded-lg border border-slate-200">
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                                Preview Selected Items
                            </div>
                            <div className="max-h-72 overflow-auto">
                                <ResponsiveTable minWidth="560px">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-white">
                                            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                                                <th className="px-4 py-2">SKU</th>
                                                <th className="px-4 py-2">Name</th>
                                                <th className="px-4 py-2 text-right">Current</th>
                                                <th className="px-4 py-2 text-right">New</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedEligibleItems.map(item => (
                                                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                                                    <td className="px-4 py-2 font-mono text-xs text-slate-600">{item.sku}</td>
                                                    <td className="px-4 py-2 text-slate-800">{item.name}</td>
                                                    <td className="px-4 py-2 text-right text-slate-600">{Number(item.price_default || 0).toLocaleString('id-ID')}</td>
                                                    <td className="px-4 py-2 text-right font-semibold text-indigo-700">
                                                        {batchPriceValue.trim() === '' ? '-' : Number(batchPriceValue || 0).toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ResponsiveTable>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setIsBatchPriceModalOpen(false)}
                                disabled={isBatchSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBatchPriceSave}
                                isLoading={isBatchSaving}
                            >
                                Save Batch Update
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <VendorItemManager
                isOpen={!!vendorItemItemId}
                onClose={() => setVendorItemItemId(null)}
                itemId={vendorItemItemId || ''}
                itemName={vendorItemItemName}
                onSaved={() => {}}
            />
        </div>
    )
}
