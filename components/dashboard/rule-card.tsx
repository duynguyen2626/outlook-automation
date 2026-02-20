'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Edit2, Mail } from "lucide-react"
import { toast } from "sonner"
import type { Rule } from "@/types"

interface RuleCardProps {
    rule: Rule
}

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { RuleForm } from "./rule-form"
import { deleteRuleAction, toggleRuleStatusAction } from "@/actions/rules"
import { runRuleNow } from "@/actions/scan"
import { Play } from "lucide-react"

export function RuleCard({ rule }: RuleCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)

    const handleRunNow = async () => {
        setIsRunning(true)
        try {
            const result = await runRuleNow(rule.id)
            if (result.success) {
                toast.success(`Run completed: ${result.moved} moved, ${result.failed} failed`)
            } else {
                toast.error(result.message || "Failed to run rule")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsRunning(false)
        }
    }
    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this rule?')) return

        try {
            const result = await deleteRuleAction(rule.id)
            if (result.success) {
                toast.success('Rule deleted')
            } else {
                toast.error(result.error || 'Failed to delete rule')
            }
        } catch (err) {
            toast.error('An unexpected error occurred')
        }
    }

    const handleToggleStatus = async () => {
        try {
            const result = await toggleRuleStatusAction(rule.id, rule.is_active)
            if (result.success) {
                toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`)
            } else {
                toast.error(result.error || 'Failed to update status')
            }
        } catch (err) {
            toast.error('An unexpected error occurred')
        }
    }

    return (
        <>
            <div className="group relative overflow-hidden rounded-xl border bg-white/50 backdrop-blur-sm p-6 shadow-sm transition-all hover:bg-white/80 hover:shadow-md dark:bg-slate-900/50 dark:hover:bg-slate-900/80">
                <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{rule.name}</h3>
                        {rule.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">{rule.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {rule.conditions?.unread_only && (
                            <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-600 border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wider"
                            >
                                Unread Only
                            </Badge>
                        )}
                        {rule.is_active ? (
                            <Badge
                                variant="default"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-500/20 transition-all active:scale-95"
                                onClick={handleToggleStatus}
                            >
                                <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-500 border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-all active:scale-95"
                                onClick={handleToggleStatus}
                            >
                                Inactive
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sender Filter</span>
                        <div className="flex items-center gap-2">
                            {rule.sender_pattern ? (
                                <code className="rounded bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                    {rule.sender_pattern}
                                </code>
                            ) : (
                                <span className="text-xs text-slate-400 italic">None</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                            {rule.keywords && rule.keywords.length > 0 ? (
                                rule.keywords.map((kw, i) => (
                                    <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none font-medium text-[11px]">
                                        {kw}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">None</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Destination</span>
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-1.5 border border-blue-100 dark:border-blue-800">
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    {rule.target_folder}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <div className="flex gap-1.5">
                        {rule.categories && rule.categories.map((cat, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] font-semibold border-slate-200">
                                {cat}
                            </Badge>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            onClick={handleRunNow}
                            disabled={isRunning}
                        >
                            <Play className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                            {isRunning ? "Running..." : "Run Now"}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            onClick={() => setIsEditOpen(true)}
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-xl border-none shadow-2xl p-8">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Edit Rule</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Update your mail organization rule settings.
                        </DialogDescription>
                    </DialogHeader>

                    <RuleForm
                        initialData={rule}
                        onSuccess={() => setIsEditOpen(false)}
                        onCancel={() => setIsEditOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}
