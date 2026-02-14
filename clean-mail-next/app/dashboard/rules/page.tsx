import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { Plus } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function RulesPage() {
    const { data: rules } = await supabase.from('clean_mail_rules').select('*').order('created_at', { ascending: false })

    return (
        <div className="p-8 space-y-8">
            {/* MVP: Simple create via Server Action would be better, but let's just show a toast or redirect for now.
  Real implementation requires a form. For this turn, I'll verify the data fix first. */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Rules</h2>
                    <p className="text-muted-foreground">Manage your email organization rules.</p>
                </div>
                {/* Placeholder for now, users can edit code or sql. 
             If I have time I should add a CreateDialog. */}
                <Button className="gap-2" disabled><Plus className="w-4 h-4" /> New Rule (Coming Soon)</Button>
            </div>

            <div className="grid gap-4">
                {rules && rules.map((rule) => (
                    <Card key={rule.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">
                                {rule.name}
                                {rule.description && <p className="text-sm font-normal text-muted-foreground mt-1">{rule.description}</p>}
                            </CardTitle>
                            <Switch checked={rule.is_active} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                <div className="flex gap-2">
                                    <span className="font-semibold w-20">Target:</span>
                                    <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{rule.target_folder}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-semibold w-20">Conditions:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {rule.conditions.keywords?.map((k: string) => (
                                            <span key={k} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{k}</span>
                                        ))}
                                        {rule.conditions.senders?.map((s: string) => (
                                            <span key={s} className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {(!rules || rules.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">No rules found. Create one to get started.</div>
                )}
            </div>
        </div>
    )
}
