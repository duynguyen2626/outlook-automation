'use client'

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { Plus } from "lucide-react"
import { RuleForm } from "./rule-form"

export function CreateRuleButton() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 px-6"
            >
                <Plus className="w-5 h-5" />
                New Rule
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-xl border-none shadow-2xl p-8">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Create New Rule</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Set up a new mail organization rule with filters and automatic actions.
                        </DialogDescription>
                    </DialogHeader>

                    <RuleForm
                        onSuccess={() => setOpen(false)}
                        onCancel={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}
