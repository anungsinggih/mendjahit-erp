import { useState } from 'react'
import { SalesReturnForm } from './SalesReturnForm';
import { PageHeader } from './ui/PageHeader';
import { Alert } from './ui/Alert';

export default function SalesReturn() {
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
                title="Sales Return Processing"
                description="Process customer returns, create drafts, and manage stock adjustments."
                breadcrumbs={[
                    { label: "Dashboard", href: "/" },
                    { label: "Sales", href: "/sales/history" },
                    { label: "New Return" }
                ]}
            />

            {error && <Alert variant="error" description={error} />}
            {success && <Alert variant="success" description={success} />}

            <div className="max-w-6xl mx-auto">
                <SalesReturnForm onSuccess={handleSuccess} onError={handleError} />
            </div>
        </div>
    )
}
