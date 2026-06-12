import { useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from './ui/Button'
import { Icons } from './ui/Icons'
import { PageHeader } from './ui/PageHeader'
import { useConfirm } from './ui/ConfirmDialogContext'
import VendorList from './VendorList'
import VendorForm, { type Vendor } from './VendorForm'
import { getErrorMessage } from '../lib/errors'
import { formatCurrency } from '../lib/format'
import { useNavigate } from 'react-router-dom'
import { vendorQueryKeys, useVendorsQuery, useVendorOutstandingQuery, prefetchVendorDetail, useQueryClient } from '../hooks/useQueries'
import { useRouteModal } from '../hooks/useRouteModal'
import { WorkspaceOverlayShell } from './ui/WorkspaceOverlayShell'
import VendorDetail from './VendorDetail'

export default function Vendors() {
    const navigate = useNavigate()
    const { confirm } = useConfirm()
    const queryClient = useQueryClient()
    const { isOpen, modal, id, openModal, replaceModal, closeModal } = useRouteModal()

    const { data: vendors = [], isLoading, isFetching, error: fetchError, refetch } = useVendorsQuery()

    const { data: outstanding, isLoading: statsLoading, error: statsError, refetch: refetchOutstanding } = useVendorOutstandingQuery()

    const stats = useMemo(() => {
        const active = vendors.filter(v => v.is_active).length
        return {
            total: vendors.length,
            active,
            inactive: vendors.length - active,
            outstanding: statsError ? null : (outstanding ?? null)
        }
    }, [vendors, outstanding, statsError])

    const handleSuccess = useCallback((savedId: string) => {
        refetch()
        refetchOutstanding()
        queryClient.invalidateQueries({ queryKey: vendorQueryKeys.all })
        queryClient.invalidateQueries({ queryKey: vendorQueryKeys.outstanding })
        queryClient.invalidateQueries({ queryKey: vendorQueryKeys.detailRoot })
        replaceModal({ modal: 'vendor.detail', values: { id: savedId } })
    }, [refetch, refetchOutstanding, queryClient, replaceModal])

    const handleAddVendor = useCallback(() => {
        openModal({ modal: 'vendor.create' })
    }, [openModal])

    const handleEdit = useCallback((vendor: Vendor) => {
        openModal({ modal: 'vendor.edit', values: { id: vendor.id } })
    }, [openModal])

    const handleView = useCallback((vendor: Vendor) => {
        openModal({ modal: 'vendor.detail', values: { id: vendor.id } })
    }, [openModal])

    const handlePrefetch = useCallback((id: string) => {
        prefetchVendorDetail(queryClient, id)
    }, [queryClient])

    const handleCreatePurchase = useCallback((vendor: Vendor) => {
        navigate(`/purchases?vendor=${vendor.id}`)
    }, [navigate])

    const handleDelete = useCallback(async (id: string) => {
        const ok = await confirm({
            title: "Delete Vendor",
            description: "Delete vendor? This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            tone: "danger",
        })
        if (!ok) return
        const { error } = await supabase.from('vendors').delete().eq('id', id)
        if (error) {
            void confirm({
                title: "Cannot Delete",
                description: "Could not delete. Try deactivating.",
                confirmText: "OK",
                hideCancel: true,
            })
        }
        else {
            refetch()
            refetchOutstanding()
            queryClient.invalidateQueries({ queryKey: vendorQueryKeys.all })
            queryClient.invalidateQueries({ queryKey: vendorQueryKeys.outstanding })
            queryClient.invalidateQueries({ queryKey: vendorQueryKeys.detail(id) })
        }
    }, [confirm, refetch, refetchOutstanding, queryClient])

    const loading = isLoading || isFetching
    const fetchErrorMessage = fetchError ? getErrorMessage(fetchError) : null
    const selectedVendor = useMemo(
        () => vendors.find((vendor) => vendor.id === id) ?? null,
        [vendors, id],
    )

    const overlayTitle = modal === 'vendor.edit'
        ? 'Edit Vendor'
        : modal === 'vendor.detail'
            ? 'Vendor Detail'
            : 'New Vendor'

    const overlaySize = modal === 'vendor.detail' ? 'wide' : 'narrow'

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Vendors"
                description="Manage your supplier database, track outstanding payables, and purchase history."
                actions={
                    <Button onClick={handleAddVendor} icon={<Icons.Plus className="w-4 h-4" />} className="w-full sm:w-auto">New Vendor</Button>
                }
            />

            {fetchErrorMessage && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center gap-2">
                    <Icons.Warning className="w-5 h-5 flex-shrink-0" /> Error: {fetchErrorMessage}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Total Vendors</p>
                            <p className="text-3xl font-bold text-indigo-900">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icons.Users className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">Active / Inactive</p>
                            <p className="text-3xl font-bold text-emerald-900">{stats.active} <span className="text-lg text-slate-500">/</span> <span className="text-2xl text-slate-600">{stats.inactive}</span></p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icons.CheckCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-1">Outstanding AP</p>
                            <p className="text-2xl font-bold text-rose-900">
                                {statsLoading ? '...' : stats.outstanding === null ? '-' : formatCurrency(stats.outstanding)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icons.DollarSign className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <VendorList
                vendors={vendors}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onCreatePurchase={handleCreatePurchase}
                onPrefetch={handlePrefetch}
            />

            <WorkspaceOverlayShell
                isOpen={isOpen}
                onClose={closeModal}
                title={overlayTitle}
                size={overlaySize}
            >
                {modal === 'vendor.create' && (
                    <VendorForm
                        onSuccess={handleSuccess}
                        onCancel={closeModal}
                    />
                )}

                {modal === 'vendor.edit' && id && (
                    selectedVendor ? (
                        <VendorForm
                            initialData={selectedVendor}
                            onSuccess={handleSuccess}
                            onCancel={closeModal}
                        />
                    ) : loading ? (
                        <div className="py-8 text-center text-sm text-slate-500">Loading vendor...</div>
                    ) : (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Vendor not found.
                        </div>
                    )
                )}

                {modal === 'vendor.detail' && id && (
                    <VendorDetail
                        vendorId={id}
                        embedded
                        onClose={closeModal}
                        onOpenEdit={(vendorId) => replaceModal({ modal: 'vendor.edit', values: { id: vendorId } })}
                    />
                )}
            </WorkspaceOverlayShell>
        </div >
    )
}
