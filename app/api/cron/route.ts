import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from "@/lib/supabase-admin"
import { runRuleNow } from "@/actions/scan"

export async function GET(req: NextRequest) {
    // Check for authorization (CRON_SECRET)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        console.log("Triggering daily cron for all active rules...")

        // 1. Fetch all active rules
        const { data: rules, error } = await supabaseAdmin
            .from('clean_mail_rules')
            .select('id, name')
            .eq('is_active', true)

        if (error) throw error

        const results = []
        for (const rule of rules) {
            console.log(`Executing rule: ${rule.name}`)
            const result = await runRuleNow(rule.id)
            results.push({
                rule: rule.name,
                success: result.success,
                moved: (result as any).moved || 0,
                failed: (result as any).failed || 0
            })
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        })

    } catch (error: any) {
        console.error("Cron error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
