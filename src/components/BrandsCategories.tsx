import { SimpleMasterCRUD } from './SimpleMasterCRUD'
import { PageHeader } from './ui/PageHeader'

export default function BrandsCategories() {
    return (
        <div className="w-full space-y-6">
            <PageHeader
                title="Brands & Categories"
                description="Organize your products by brand and category for better inventory management."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SimpleMasterCRUD table="brands" title="Brands" />
                <SimpleMasterCRUD table="categories" title="Categories" />
            </div>
        </div>
    )
}
