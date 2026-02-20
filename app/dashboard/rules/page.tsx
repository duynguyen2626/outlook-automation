import { Button } from "@/components/ui/button"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Plus } from "lucide-react"
import { RuleCard } from "@/components/dashboard/rule-card"
import { CreateRuleButton } from "@/components/dashboard/create-rule-button"
import { RuleDebugger } from "@/components/dashboard/rule-debugger"
import { RulesToolbar } from "@/components/dashboard/rules-toolbar"

export const dynamic = 'force-dynamic'

export default async function RulesPage() {
    const { data: rules } = await supabaseAdmin.from('clean_mail_rules').select('*').order('created_at', { ascending: false })

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Rules</h2>
                    <p className="text-muted-foreground">Create and manage your email organization rules.</p>
                </div>
                <CreateRuleButton />
            </div>

            <RulesToolbar />

            {/* Debug Section */}
            {rules && rules.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Rule Debug Inspector</h3>
                    {rules.map((rule) => (
                        <RuleDebugger key={rule.id} rule={rule} />
                    ))}
                </div>
            )}

            <div className="grid gap-4">
                {rules && rules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} />
                ))}
                {(!rules || rules.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                        No rules found. Click "New Rule" to create your first rule.
                    </div>
                )}
            </div>
        </div>
    )
}
