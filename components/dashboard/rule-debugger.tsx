'use client'

import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import type { Rule } from "@/types"

interface RuleDebuggerProps {
    rule: Rule
}

export function RuleDebugger({ rule }: RuleDebuggerProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 px-4 py-3 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{rule.name}</span>
                        <span className="ml-3 font-mono text-[10px] text-slate-400 uppercase tracking-tighter">{rule.id}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {rule.is_active && (
                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/20 text-emerald-600 bg-emerald-50/50">
                            DEBUGGING
                        </Badge>
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Sender pattern</div>
                            <code className="block p-2 rounded bg-slate-800 text-indigo-400 text-xs font-mono border border-slate-700">
                                {rule.sender_pattern || 'null'}
                            </code>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Keywords</div>
                            <div className="h-[34px] flex items-center gap-1 overflow-x-auto no-scrollbar">
                                {rule.keywords && rule.keywords.length > 0 ? (
                                    rule.keywords.map((kw, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] whitespace-nowrap bg-slate-200/50 text-slate-600 border-none">{kw}</Badge>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 italic">None</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Target path</div>
                            <code className="block p-2 rounded bg-slate-800 text-emerald-400 text-xs font-mono border border-slate-700 truncate">
                                {rule.target_folder}
                            </code>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Conditions</div>
                            <code className="block p-2 rounded bg-slate-800 text-amber-400 text-xs font-mono border border-slate-700 truncate">
                                unread_only: {String(rule.conditions?.unread_only ?? false)} | read: {String(rule.conditions?.must_be_read ?? false)}
                            </code>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Full Object Snapshot</div>
                        <pre className="p-4 rounded-xl bg-slate-900 text-slate-300 text-[11px] font-mono overflow-auto max-h-60 border border-slate-800 shadow-inner">
                            {JSON.stringify(rule, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
