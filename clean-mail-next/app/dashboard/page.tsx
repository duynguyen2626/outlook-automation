import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, Mail, ShieldAlert } from "lucide-react"
import { BulkOrganizer } from "@/components/dashboard/bulk-organizer"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {

    // Fetch Stats
    const { count: movedCount } = await supabase.from('clean_mail_logs').select('*', { count: 'exact', head: true }).eq('status', 'moved')
    const { count: totalCount } = await supabase.from('clean_mail_logs').select('*', { count: 'exact', head: true })

    // Fetch Recent Logs
    const { data: logs } = await supabase
        .from('clean_mail_logs')
        .select('*, clean_mail_rules(name)')
        .order('processed_at', { ascending: false })
        .limit(10)

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Email Organizer</h2>
                    <p className="text-muted-foreground">Scan, Review, and Move your emails.</p>
                </div>
            </div>

            {/* Main Organizer Component - Full Width */}
            <div className="w-full">
                <BulkOrganizer />
            </div>

            {/* Stats - Move below or optional */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emails Moved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{movedCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Historical Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Scanned</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Across all folders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Errors</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">All systems operational</p>
                    </CardContent>
                </Card>
            </div >

            <div className="space-y-4">
                <h3 className="text-xl font-bold">Recent Activity Log</h3>
                <Card>
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Time</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Action</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Subject</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Rule</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {logs && logs.length > 0 ? logs.map((log) => (
                                        <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle">{new Date(log.processed_at).toLocaleTimeString()}</td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${log.status === 'moved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle font-medium">{log.email_subject}</td>
                                            <td className="p-4 align-middle">{log.clean_mail_rules?.name || 'Unknown'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-muted-foreground">No recent activity</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
