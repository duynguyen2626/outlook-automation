'use client'

import { Button } from "@/components/ui/button"
import { Play, RotateCcw, RefreshCcw, ShieldCheck } from "lucide-react"
import { syncOutlookRulesAction } from "@/actions/outlook-rules"
import { resetFoldersToInboxAction } from "@/actions/maintenance"
import { bulkSetUnreadOnlyAction, triggerAllActiveRulesAction } from "@/actions/rules"
import { toast } from "sonner"
import { useState } from "react"

export function RulesToolbar() {
    const [loading, setLoading] = useState<string | null>(null)

    const handleSync = async () => {
        setLoading('sync')
        try {
            const res = await syncOutlookRulesAction()
            if (res.success) toast.success(res.message)
            else toast.error(res.message)
        } catch (err) {
            toast.error("Failed to sync")
        } finally {
            setLoading(null)
        }
    }

    const handleReset = async () => {
        if (!confirm("Careful! This will move ALL emails from ALL subfolders back to Inbox. Are you sure?")) return
        setLoading('reset')
        try {
            const res = await resetFoldersToInboxAction()
            if (res.success) toast.success(res.message)
            else toast.error(res.message)
        } catch (err) {
            toast.error("Error resetting folders")
        } finally {
            setLoading(null)
        }
    }

    const handleBulkUnread = async () => {
        setLoading('bulk')
        try {
            const res = await bulkSetUnreadOnlyAction(true)
            if (res.success) toast.success(res.message)
            else toast.error(res.error || "Failed")
        } catch (err) {
            toast.error("Error")
        } finally {
            setLoading(null)
        }
    }

    const handleTriggerAll = async () => {
        setLoading('trigger')
        try {
            const res = await triggerAllActiveRulesAction()
            if (res.success) toast.success(res.message)
            else toast.error(res.error || "Failed")
        } catch (err) {
            toast.error("Error")
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="flex flex-wrap gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={!!loading}
                className="gap-2 bg-white"
            >
                <RefreshCcw className={`w-4 h-4 ${loading === 'sync' ? 'animate-spin' : ''}`} />
                Sync from Outlook
            </Button>

            <Button
                size="sm"
                variant="outline"
                onClick={handleBulkUnread}
                disabled={!!loading}
                className="gap-2 bg-white text-indigo-600 border-indigo-100"
            >
                <ShieldCheck className="w-4 h-4" />
                Set rules to Unread-only
            </Button>

            <Button
                size="sm"
                variant="outline"
                onClick={handleTriggerAll}
                disabled={!!loading}
                className="gap-2 bg-white text-emerald-600 border-emerald-100"
            >
                <Play className={`w-4 h-4 ${loading === 'trigger' ? 'animate-spin' : ''}`} />
                Trigger All Now
            </Button>

            <div className="flex-1" />

            <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={!!loading}
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
                <RotateCcw className={`w-4 h-4 ${loading === 'reset' ? 'animate-spin' : ''}`} />
                Reset Folders to Inbox
            </Button>
        </div>
    )
}
