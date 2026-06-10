import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Combobox } from './ui/Combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table'
import { Badge } from './ui/Badge'
import { Icons } from './ui/Icons'
import { Alert } from './ui/Alert'
import { getErrorMessage } from '../lib/errors'

type VendorItemRow = {
    id: string
    vendor_id: string
    item_id: string
    unit_cost: number
    is_active: boolean
    is_preferred: boolean
    last_purchase_at: string | null
    notes: string | null
    vendor_name?: string
}

type Props = {
    isOpen: boolean
    onClose: () => void
    itemId: string
    itemName: string
    onSaved?: () => void
}

export default function VendorItemManager({ isOpen, onClose, itemId, itemName, onSaved }: Props) {
    const [rows, setRows] = useState<VendorItemRow[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])

    // New row form
    const [newVendorId, setNewVendorId] = useState('')
    const [newUnitCost, setNewUnitCost] = useState('')
    const [newIsPreferred, setNewIsPreferred] = useState(false)

    const fetch = useCallback(async () => {
        if (!itemId) return
        setLoading(true)
        setError(null)
        try {
            // Fetch vendors for dropdown
            const { data: venData, error: venErr } = await supabase
                .from('vendors')
                .select('id, name')
                .eq('is_active', true)
                .order('name')
            if (venErr) throw venErr
            setVendors(venData || [])

            // Fetch vendor_items with vendor name
            const { data, error } = await supabase
                .from('vendor_items')
                .select('id, vendor_id, item_id, unit_cost, is_active, is_preferred, last_purchase_at, notes, vendors!inner(name)')
                .eq('item_id', itemId)
                .order('is_preferred', { ascending: false })
                .order('last_purchase_at', { ascending: false })

            if (error) throw error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: VendorItemRow[] = (data || []).map((row: any) => ({
                id: row.id,
                vendor_id: row.vendor_id,
                item_id: row.item_id,
                unit_cost: Number(row.unit_cost) || 0,
                is_active: row.is_active,
                is_preferred: row.is_preferred,
                last_purchase_at: row.last_purchase_at,
                notes: row.notes,
                vendor_name: row.vendors?.name || 'Unknown',
            }))
            setRows(mapped)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [itemId])

    useEffect(() => {
        if (isOpen) fetch()
    }, [isOpen, fetch])

    const handleAdd = async () => {
        if (!newVendorId || !newUnitCost) return
        setSaving(true)
        setError(null)
        try {
            const cost = Number(newUnitCost)
            if (cost < 0) throw new Error('Unit cost must be >= 0')

            const { error } = await supabase
                .from('vendor_items')
                .upsert(
                    {
                        vendor_id: newVendorId,
                        item_id: itemId,
                        unit_cost: cost,
                        is_active: true,
                        is_preferred: newIsPreferred,
                        notes: 'Added manually',
                    },
                    { onConflict: 'vendor_id,item_id' }
                )
            if (error) throw error

            setNewVendorId('')
            setNewUnitCost('')
            setNewIsPreferred(false)
            setSuccess('Vendor HPP added')
            await fetch()
            onSaved?.()
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    const handleToggleActive = async (row: VendorItemRow) => {
        try {
            const { error } = await supabase
                .from('vendor_items')
                .update({ is_active: !row.is_active })
                .eq('id', row.id)
            if (error) throw error
            await fetch()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleSetPreferred = async (row: VendorItemRow) => {
        try {
            // Unset all preferred for this item, then set this one
            await supabase
                .from('vendor_items')
                .update({ is_preferred: false })
                .eq('item_id', itemId)
            await supabase
                .from('vendor_items')
                .update({ is_preferred: true })
                .eq('id', row.id)
            await fetch()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleUpdateCost = async (row: VendorItemRow, newCost: number) => {
        try {
            const { error } = await supabase
                .from('vendor_items')
                .update({ unit_cost: newCost })
                .eq('id', row.id)
            if (error) throw error
            await fetch()
            onSaved?.()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleDelete = async (row: VendorItemRow) => {
        try {
            const { error } = await supabase
                .from('vendor_items')
                .delete()
                .eq('id', row.id)
            if (error) throw error
            await fetch()
            onSaved?.()
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} contentClassName="max-w-5xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Icons.Tag className="w-5 h-5 text-indigo-500" />
                    Supplier HPP — {itemName}
                </DialogTitle>
            </DialogHeader>
            <DialogContent>
                {error && <Alert variant="error" title="Error" description={error} />}
                {success && <Alert variant="success" title="Success" description={success} />}

                {/* Existing rows */}
                <div className="mb-4 overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-4 text-slate-400">Loading...</div>
                    ) : rows.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 italic">
                            No vendor HPP configured for this item.
                        </div>
                    ) : (
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead className="text-right">Unit Cost (HPP)</TableHead>
                                    <TableHead className="text-center">Preferred</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            {row.vendor_name}
                                            {row.last_purchase_at && (
                                                <div className="text-xs text-slate-400">
                                                    Last purchase: {new Date(row.last_purchase_at).toLocaleDateString('id-ID')}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1"
                                                defaultValue={String(row.unit_cost)}
                                                onBlur={(e) => {
                                                    const val = Number(e.target.value)
                                                    if (val !== row.unit_cost && val >= 0) {
                                                        handleUpdateCost(row, val)
                                                    }
                                                }}
                                                className="h-8 w-28 text-right"
                                                containerClassName="!mb-0 inline-block"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                size="sm"
                                                variant={row.is_preferred ? 'primary' : 'ghost'}
                                                onClick={() => handleSetPreferred(row)}
                                                className={row.is_preferred ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                                            >
                                                {row.is_preferred ? '★ Preferred' : 'Set'}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={() => handleToggleActive(row)}
                                                className="cursor-pointer"
                                            >
                                                <Badge
                                                    variant={row.is_active ? 'success' : 'secondary'}
                                                >
                                                    {row.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(row)}
                                                className="text-slate-400 hover:text-rose-600"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Add new */}
                <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Vendor HPP</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-end">
                        <div className="sm:col-span-4">
                            <Combobox
                                label="Vendor"
                                value={newVendorId}
                                onChange={setNewVendorId}
                                placeholder="Select vendor..."
                                searchPlaceholder="Search vendor..."
                                options={vendors
                                    .filter((v) => !rows.some((r) => r.vendor_id === v.id && r.is_active))
                                    .map((v) => ({
                                        label: v.name,
                                        value: v.id,
                                    }))}
                                containerClassName="!mb-0"
                            />
                        </div>
                        <div className="sm:col-span-3">
                            <Input
                                label="Unit Cost (HPP)"
                                type="number"
                                min="0"
                                step="1"
                                value={newUnitCost}
                                onChange={(e) => setNewUnitCost(e.target.value)}
                                placeholder="0"
                                containerClassName="!mb-0"
                            />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2 pt-0 mb-3">
                            <input
                                type="checkbox"
                                id="preferred"
                                checked={newIsPreferred}
                                onChange={(e) => setNewIsPreferred(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                            />
                            <label htmlFor="preferred" className="text-sm text-slate-600">Preferred</label>
                        </div>
                        <div className="sm:col-span-2">
                            <Button
                                onClick={handleAdd}
                                disabled={saving || !newVendorId || !newUnitCost}
                                className="w-full"
                            >
                                {saving ? 'Adding...' : 'Add'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
