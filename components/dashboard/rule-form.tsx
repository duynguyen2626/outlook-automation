'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { toast } from "sonner"
import { Rule } from "@/types"
import { createRuleAction, updateRuleAction } from "@/actions/rules"
import { listMailFolders } from "@/actions/list-folders"
import { useEffect } from "react"

interface RuleFormProps {
    initialData?: Rule
    onSuccess: () => void
    onCancel: () => void
}

export function RuleForm({ initialData, onSuccess, onCancel }: RuleFormProps) {
    const [loading, setLoading] = useState(false)
    const [folders, setFolders] = useState<string[]>([])
    const [name, setName] = useState(initialData?.name || "")
    const [description, setDescription] = useState(initialData?.description || "")
    const [senderPattern, setSenderPattern] = useState(initialData?.sender_pattern || "")
    const [keywords, setKeywords] = useState(initialData?.keywords?.join(', ') || "")
    const [targetFolder, setTargetFolder] = useState(initialData?.target_folder || "")
    const [unreadOnly, setUnreadOnly] = useState(initialData?.conditions?.unread_only || false)

    useEffect(() => {
        async function fetchFolders() {
            const result = await listMailFolders()
            if (result.success && result.folders) {
                const names = result.folders.map(f => f.displayName)
                setFolders([...new Set(names)].sort())
            }
        }
        fetchFolders()
    }, [])

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("Rule name is required")
            return
        }

        if (!targetFolder.trim()) {
            toast.error("Target folder is required")
            return
        }

        setLoading(true)
        try {
            const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k !== "")

            const data: Partial<Rule> = {
                name,
                description,
                sender_pattern: senderPattern,
                keywords: keywordList,
                target_folder: targetFolder,
                is_active: initialData ? initialData.is_active : true,
                conditions: {
                    senders: senderPattern ? [senderPattern] : [],
                    keywords: keywordList,
                    unread_only: unreadOnly,
                    must_be_read: false
                }
            }

            const result = initialData
                ? await updateRuleAction(initialData.id, data)
                : await createRuleAction(data)

            if (result.success) {
                toast.success(initialData ? "Rule updated" : "Rule created")
                onSuccess()
            } else {
                toast.error(result.error || "Failed to save rule")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 py-4">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Rule Name *</label>
                    <Input
                        placeholder="e.g., Cashback Emails"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Description</label>
                    <Input
                        placeholder="e.g., Categorize all cashback related emails"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Sender Filter</label>
                        <Input
                            placeholder="e.g., vietcombank.com.vn"
                            value={senderPattern}
                            onChange={(e) => setSenderPattern(e.target.value)}
                            className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Destination Folder *</label>
                        <Input
                            placeholder="e.g., Banking/VCB"
                            value={targetFolder}
                            onChange={(e) => setTargetFolder(e.target.value)}
                            list="folder-suggestions"
                            className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                        <datalist id="folder-suggestions">
                            {folders.map((folder, i) => (
                                <option key={i} value={folder} />
                            ))}
                        </datalist>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Keywords (comma-separated)</label>
                    <Input
                        placeholder="e.g., Hoàn tiền, Cashback, Reward"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                    <p className="text-[11px] text-slate-400 italic">Leaves empty if you want to match all emails from the sender.</p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <input
                        type="checkbox"
                        id="unreadOnly"
                        checked={unreadOnly}
                        onChange={(e) => setUnreadOnly(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="unreadOnly" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Only process UNREAD emails
                    </label>
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 h-11 font-semibold text-slate-500"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 h-11 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                    {loading ? "Saving..." : initialData ? "Save Changes" : "Create Rule"}
                </Button>
            </div>
        </div>
    )
}
