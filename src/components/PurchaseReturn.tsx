import { useState } from 'react'
import { PurchaseReturnForm } from './PurchaseReturnForm';
import { PageHeader } from './ui/PageHeader';
import { Alert } from './ui/Alert';

export default function PurchaseReturn() {
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    function handleSuccess(msg: string) {
        setSuccess(msg);
        setError(null);
    }

    function handleError(msg: string) {
        setError(msg);
        setSuccess(null);
    }

    return (
        <div className="w-full space-y-6 pb-20">
            <PageHeader
                title="Purchase Return Management"
                description="Process returns to vendors, create drafts, and update stock."
                breadcrumbs={[
                    { label: "Dashboard", href: "/" },
                    { label: "Purchases", href: "/purchases/history" },
                    { label: "New Return" }
                ]}
            />

            <div className="max-w-6xl mx-auto space-y-4">
                {error && <Alert variant="error" title="Error" description={error} />}
                {success && <Alert variant="success" title="Success" description={success} />}

                <PurchaseReturnForm onSuccess={handleSuccess} onError={handleError} />
            </div>
        </div>
    )
}
