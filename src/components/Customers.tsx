import { useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from './ui/Button'
import { Icons } from './ui/Icons'
import { PageHeader } from './ui/PageHeader'
import { useConfirm } from './ui/ConfirmDialogContext'
import CustomerForm, { type Customer } from './CustomerForm'
import CustomerList from './CustomerList'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import { formatCurrency } from '../lib/format'
import { customerQueryKeys, useCustomersQuery, useCustomerOutstandingQuery, prefetchCustomerDetail, useQueryClient } from '../hooks/useQueries'
import { useRouteModal } from '../hooks/useRouteModal'
import { WorkspaceOverlayShell } from './ui/WorkspaceOverlayShell'
import CustomerDetail from './CustomerDetail'
import CustomerPricePage from './CustomerPricePage'

export default function Customers() {
    const navigate = useNavigate()
    const { confirm } = useConfirm()
    const queryClient = useQueryClient()
    const { isOpen, modal, id, openModal, replaceModal, closeModal } = useRouteModal()

    const { data: customers = [], isLoading, isFetching, error: fetchError, refetch } = useCustomersQuery()

    const { data: outstanding, isLoading: statsLoading, error: statsError, refetch: refetchOutstanding } = useCustomerOutstandingQuery()

    const stats = useMemo(() => {
        const active = customers.filter(c => c.is_active).length
        return {
            total: customers.length,
            active,
            inactive: customers.length - active,
            outstanding: statsError ? null : (outstanding ?? null)
        }
    }, [customers, outstanding, statsError])

    const handleSuccess = useCallback((savedId: string) => {
        refetch()
        refetchOutstanding()
        queryClient.invalidateQueries({ queryKey: customerQueryKeys.all })
        queryClient.invalidateQueries({ queryKey: customerQueryKeys.outstanding })
        queryClient.invalidateQueries({ queryKey: customerQueryKeys.detailRoot })
        replaceModal({ modal: 'customer.detail', values: { id: savedId } })
    }, [refetch, refetchOutstanding, queryClient, replaceModal])

    const handleAddCustomer = useCallback(() => {
        openModal({ modal: 'customer.create' })
    }, [openModal])

    const handleEdit = useCallback((customer: Customer) => {
        openModal({ modal: 'customer.edit', values: { id: customer.id } })
    }, [openModal])

    const handlePrices = useCallback((customer: Customer) => {
        openModal({ modal: 'customer.pricing', values: { id: customer.id } })
    }, [openModal])

    const handleView = useCallback((customer: Customer) => {
        openModal({ modal: 'customer.detail', values: { id: customer.id } })
    }, [openModal])

    const handlePrefetch = useCallback((id: string) => {
        prefetchCustomerDetail(queryClient, id)
    }, [queryClient])

    const handleCreateSale = useCallback((customer: Customer) => {
        navigate(`/sales?customer=${customer.id}`)
    }, [navigate])

    const handleDelete = useCallback(async (id: string) => {
        const ok = await confirm({
            title: "Delete Customer",
            description: "Delete customer? This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            tone: "danger",
        })
        if (!ok) return
        const { error } = await supabase.from('customers').delete().eq('id', id)
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
            queryClient.invalidateQueries({ queryKey: customerQueryKeys.all })
            queryClient.invalidateQueries({ queryKey: customerQueryKeys.outstanding })
            queryClient.invalidateQueries({ queryKey: customerQueryKeys.detail(id) })
        }
    }, [confirm, refetch, refetchOutstanding, queryClient])

    const loading = isLoading || isFetching
    const fetchErrorMessage = fetchError ? getErrorMessage(fetchError) : null
    const selectedCustomer = useMemo(
        () => customers.find((customer) => customer.id === id) ?? null,
        [customers, id],
    )

    const overlayTitle = modal === 'customer.edit'
        ? 'Edit Customer'
        : modal === 'customer.detail'
            ? 'Customer Detail'
            : modal === 'customer.pricing'
                ? 'Customer Pricing'
                : 'New Customer'

    const overlaySize = modal === 'customer.detail' || modal === 'customer.pricing' ? 'wide' : 'narrow'

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Customers"
                description="Manage your customer database, view outstanding balances, and transaction history."
                actions={
                    <Button onClick={handleAddCustomer} icon={<Icons.Plus className="w-4 h-4" />} className="w-full sm:w-auto">New Customer</Button>
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
                            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Total Customers</p>
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

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">Outstanding AR</p>
                            <p className="text-2xl font-bold text-amber-900">
                                {statsLoading ? '...' : stats.outstanding === null ? '-' : formatCurrency(stats.outstanding)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icons.DollarSign className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <CustomerList
                customers={customers}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPrices={handlePrices}
                onView={handleView}
                onCreateSale={handleCreateSale}
                onPrefetch={handlePrefetch}
            />

            <WorkspaceOverlayShell
                isOpen={isOpen}
                onClose={closeModal}
                title={overlayTitle}
                size={overlaySize}
            >
                {modal === 'customer.create' && (
                    <CustomerForm
                        onSuccess={handleSuccess}
                        onCancel={closeModal}
                    />
                )}

                {modal === 'customer.edit' && id && (
                    selectedCustomer ? (
                        <CustomerForm
                            initialData={selectedCustomer}
                            onSuccess={handleSuccess}
                            onCancel={closeModal}
                        />
                    ) : loading ? (
                        <div className="py-8 text-center text-sm text-slate-500">Loading customer...</div>
                    ) : (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Customer not found.
                        </div>
                    )
                )}

                {modal === 'customer.detail' && id && (
                    <CustomerDetail
                        customerId={id}
                        embedded
                        onClose={closeModal}
                        onOpenEdit={(customerId) => replaceModal({ modal: 'customer.edit', values: { id: customerId } })}
                        onOpenPricing={(customerId) => replaceModal({ modal: 'customer.pricing', values: { id: customerId } })}
                    />
                )}

                {modal === 'customer.pricing' && id && (
                    <CustomerPricePage
                        customerId={id}
                        embedded
                    />
                )}
            </WorkspaceOverlayShell>

        </div >
    )
}
