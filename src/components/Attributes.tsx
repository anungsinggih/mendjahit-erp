import { SimpleMasterCRUD } from './SimpleMasterCRUD'
import { PageHeader } from './ui/PageHeader'

export default function Attributes() {
    return (
        <div className="w-full space-y-6">
            <PageHeader
                title="Product Attributes"
                description="Define sizes, colors, and units of measurement for your inventory items."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SimpleMasterCRUD table="sizes" title="Sizes" hasCode />
                <SimpleMasterCRUD table="colors" title="Colors" hasCode />
                <SimpleMasterCRUD table="uoms" title="UoMs" hasCode />
            </div>
        </div>
    )
}
