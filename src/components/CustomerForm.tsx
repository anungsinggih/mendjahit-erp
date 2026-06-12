import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Switch } from './ui/Switch'
import { Textarea } from './ui/Textarea'
import type { Customer as SharedCustomer } from '../types/shared'
import { z } from 'zod'

const customerSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().trim().max(30, 'Phone is too long').optional().or(z.literal('')),
    address: z.string().trim().max(500, 'Address is too long').optional().or(z.literal('')),
    customer_type: z.enum(['UMUM', 'KHUSUS', 'CUSTOM']),
    is_active: z.boolean(),
})

export type Customer = SharedCustomer

interface CustomerFormProps {
    initialData?: Customer | null
    onSuccess: (id: string) => void
    onCancel: () => void
}

export default function CustomerForm({ initialData, onSuccess, onCancel }: CustomerFormProps) {
    const [formData, setFormData] = useState<Partial<Customer>>({
        name: '', phone: '', address: '', customer_type: 'UMUM', is_active: true
    })
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
        } else {
            setFormData({ name: '', phone: '', address: '', customer_type: 'UMUM', is_active: true })
        }
    }, [initialData])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const validation = customerSchema.safeParse({
            name: formData.name ?? '',
            phone: formData.phone ?? '',
            address: formData.address ?? '',
            customer_type: formData.customer_type ?? 'UMUM',
            is_active: formData.is_active ?? true,
        })

        if (!validation.success) {
            setError(validation.error.issues[0]?.message || 'Invalid customer form')
            return
        }

        setLoading(true)

        try {
            let savedId = initialData?.id

            if (initialData?.id) {
                const { error } = await supabase
                    .from('customers')
                    .update(validation.data)
                    .eq('id', initialData.id)
                if (error) throw error
            } else {
                const { data, error } = await supabase
                    .from('customers')
                    .insert([validation.data])
                    .select('id')
                    .single()
                if (error) throw error
                savedId = data.id
            }

            if (!savedId) throw new Error('Customer save did not return id')

            onSuccess(savedId)
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message)
            else setError('An unknown error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}

            <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Company or Person Name" />
            <Input label="Phone" value={formData.phone ?? ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Optional" />
            <Textarea label="Address" value={formData.address ?? ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Full Address" />

            <Select
                label="Customer Type"
                value={formData.customer_type}
                onChange={e => setFormData({ ...formData, customer_type: e.target.value as 'UMUM' | 'KHUSUS' | 'CUSTOM' })}
                options={[
                    { label: 'General', value: 'UMUM' },
                    { label: 'Special', value: 'KHUSUS' },
                    { label: 'Custom', value: 'CUSTOM' }
                ]}
            />
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Active Status &nbsp;</span>
                <Switch
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                />
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {initialData ? 'Update Customer' : 'Create Customer'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
            </div>
        </form>
    )
}
