import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from './ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog'
import { Icons } from './ui/Icons'
import { useConfirm } from './ui/ConfirmDialogContext'
import { logger } from '../lib/logger'
import { ResponsiveTable } from './ui/ResponsiveTable'
// xlsx is loaded dynamically when import/export is triggered

type ImportDialogProps = {
    isOpen?: boolean
    onClose: () => void
    onSuccess: () => void
    embedded?: boolean
}

type PreviewRow = Record<string, unknown>;

export function ItemImportDialog({ isOpen = true, onClose, onSuccess, embedded = false }: ImportDialogProps) {
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<PreviewRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { confirm } = useConfirm()


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            parseFile(selectedFile)
        }
    }

    const parseFile = async (file: File) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const XLSX = await import('xlsx')
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as PreviewRow[]
                setPreview(jsonData)
                setError(null)
            } catch (err) {
                setError('Failed to parse file. Please ensure it is a valid Excel or CSV file.')
                logger.error('Failed to parse import file', err)
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const handleImport = async () => {
        if (!preview.length) return

        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.rpc('import_master_data', { data: preview })

            if (error) throw error

            void confirm({
                title: 'Import Success',
                description: `Processed: ${data.processed}. Inserted/Updated: ${data.inserted_or_updated}.`,
                confirmText: 'OK',
                hideCancel: true
            })
            onSuccess()
            onClose()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred during import.';
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx')
        const headers = [
            'sku', 'name',
            'brand_name', 'category_name',
            'uom_name', 'size_name', 'color_name', 'type',
            'price_default', 'price_khusus', 'purchase_price', 'min_stock', 'initial_stock'
        ]
        const sampleData = [
            // Finished Goods - menggunakan UOM dan atribut sesuai seed
            ['TS-001', 'Kaos Polos Cotton 30s Hitam L', 'Mendjahit', 'Fashion', 'PCS', 'L', 'Hitam', 'FINISHED_GOOD', 50000, 45000, 30000, 10, 100],
            ['TS-002', 'Kaos Polos Cotton 30s Putih M', 'Mendjahit', 'Fashion', 'PCS', 'M', 'Putih', 'FINISHED_GOOD', 50000, 45000, 30000, 10, 150],

            // Raw Materials
            ['RM-FAB-BLK', 'Black Cotton Combed 30s Fabric', 'Gracindo', 'Raw Material', 'PCS', 'ALL', 'Black', 'RAW_MATERIAL', 0, 0, 85000, 50, 500],
            ['RM-BTN-S', 'Kancing Kemeja Small', 'Local', 'Aksesoris', 'PCS', 'S', 'Putih', 'RAW_MATERIAL', 0, 0, 5000, 100, 1000],

            // Karate Niche Samples (TRADED)
            ['KA-GI-KUMITE-L', 'Baju Karate Kumite Size L', 'Hokido', 'Karate Gi', 'STEL', 'L', 'Putih', 'TRADED', 450000, 400000, 250000, 5, 50],
            ['KA-BELT-BLK', 'Standard Black Karate Belt', 'Mendjahit', 'Accessories', 'PCS', 'ALL', 'Black', 'TRADED', 75000, 65000, 40000, 20, 200],
            ['KA-PROT-CHEST-M', 'Chest Protector Size M', 'Muvon', 'Protector', 'SET', 'M', 'White', 'TRADED', 350000, 310000, 200000, 3, 30]
        ]

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])

        // Formatting Template Sheet
        ws['!cols'] = [
            { wch: 15 }, // sku
            { wch: 35 }, // name
            { wch: 15 }, // brand_name
            { wch: 15 }, // category_name
            { wch: 10 }, // uom_name
            { wch: 10 }, // size_name
            { wch: 10 }, // color_name
            { wch: 15 }, // type
            { wch: 15 }, // price_default
            { wch: 15 }, // price_khusus
            { wch: 15 }, // purchase_price
            { wch: 10 }, // min_stock
            { wch: 12 }  // initial_stock
        ]
        ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }] // Freeze top row

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template")

        // Instructions Sheet
        const instructionsHeader = ["Column Name", "Required?", "Description", "Valid Values / Notes"]
        const instructionsData = [
            ["sku", "YES", "Unique item code", "Must be unique and not duplicated"],
            ["name", "YES", "Item name", "Example: Kumite Karate Uniform L"],
            ["brand_name", "NO", "Brand", "Created automatically if missing"],
            ["category_name", "NO", "Category", "Created automatically if missing"],
            ["uom_name", "YES", "Unit of measure", "Example: PCS, SET, METER, KG"],
            ["size_name", "NO", "Size", "Example: S, M, L, XL, ALL"],
            ["color_name", "NO", "Color", "Example: Red, Blue, Black, White"],
            ["type", "YES", "Item type", "FINISHED_GOOD, RAW_MATERIAL, or TRADED"],
            ["price_default", "NO", "Default sale price", "Number, >= 0"],
            ["price_khusus", "NO", "Special sale price", "Number, >= 0"],
            ["purchase_price", "NO", "Buy price / cost", "Number, >= 0"],
            ["min_stock", "NO", "Minimum stock alert", "Number, >= 0"],
            ["initial_stock", "NO", "Opening stock", "Opening qty recorded in stock card as OPENING. Number, >= 0"]
        ]

        const wsInstructions = XLSX.utils.aoa_to_sheet([instructionsHeader, ...instructionsData])

        // Auto-width for instructions
        wsInstructions['!cols'] = [
            { wch: 15 }, // Column Name
            { wch: 10 }, // Required
            { wch: 30 }, // Description
            { wch: 50 }  // Notes
        ]
        wsInstructions['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }] // Freeze top row

        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions")

        XLSX.writeFile(wb, "import_items_template.xlsx")
    }

    const content = (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-sm text-blue-800">
                <p className="mb-2 font-semibold">Instructions</p>
                <ul className="list-disc ml-4 space-y-1">
                    <li>Download template to follow required columns and sample values.</li>
                    <li>Fill item data. Missing brands, categories, and masters will be created automatically.</li>
                    <li>Upload `.xlsx`, `.xls`, or `.csv` file below.</li>
                </ul>
                <div className="mt-3">
                    <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                        <Icons.Download className="w-4 h-4" />
                        Download Template
                    </button>
                </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <Icons.Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                    {file ? file.name : 'Click to select or drop file here'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200">
                    <Icons.Warning className="w-4 h-4 inline mr-2" />
                    {error}
                </div>
            )}

            {preview.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 border-b">
                        Preview ({preview.length} rows)
                    </div>
                    <div className="max-h-40 overflow-auto">
                        <ResponsiveTable minWidth="520px">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        {Object.keys(preview[0] || {}).slice(0, 5).map(key => (
                                            <th key={key} className="p-2 font-medium text-gray-500">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 5).map((row, index) => (
                                        <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                                            {Object.values(row).slice(0, 5).map((value: unknown, valueIndex) => (
                                                <td key={valueIndex} className="p-2 truncate max-w-[100px]">{String(value)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ResponsiveTable>
                        {preview.length > 5 && (
                            <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t">
                                ... and {preview.length - 5} more rows
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleImport} disabled={!file || loading || preview.length === 0}>
                    {loading ? 'Importing...' : 'Start Import'}
                </Button>
            </div>
        </div>
    )

    if (embedded) return content

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Import Items</DialogTitle>
            </DialogHeader>
            <DialogContent>{content}</DialogContent>
        </Dialog>
    )
}
