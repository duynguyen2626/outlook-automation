'use server'

import { auth } from "@/auth"
import { getGraphClient } from "@/lib/graph"
import { getAccessToken } from "@/lib/auth-helper"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

/**
 * Fetches native Outlook message rules and syncs them to our local database.
 */
export async function syncOutlookRulesAction() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, message: "Not authenticated" }
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return { success: false, message: "Failed to get access token" }
        }

        const client = getGraphClient(accessToken)

        // Fetch rules from Microsoft Graph
        // Note: Rules are usually under /me/mailFolders/inbox/messageRules for many accounts
        const response = await client.api('/me/mailFolders/inbox/messageRules').get()
        const outlookRules = response.value || []

        if (outlookRules.length === 0) {
            return { success: true, message: "No Outlook rules found.", count: 0 }
        }

        let syncedCount = 0
        for (const oRule of outlookRules) {
            // Translate Outlook Rule to our Rule format
            // Outlook Rule structure: { displayName, conditions: { senderContains, subjectContains, ... }, actions: { moveToFolder, ... } }

            const name = oRule.displayName || "Untitled Rule"
            const is_active = oRule.isEnabled !== false

            // Extract sender pattern
            const sender_pattern = oRule.conditions?.senderContains?.[0] || oRule.conditions?.fromAddresses?.[0]?.emailAddress?.address || ""

            // Extract keywords
            const keywords = oRule.conditions?.subjectContains || []

            // Extract target folder (this is the folder ID, we might need to resolve the name or just keep ID)
            const target_folder_id = oRule.actions?.moveToFolder || ""
            let target_folder_name = target_folder_id

            if (target_folder_id) {
                try {
                    const folder = await client.api(`/me/mailFolders/${target_folder_id}`).select('displayName').get()
                    target_folder_name = folder.displayName
                } catch (err) {
                    console.log(`Could not resolve folder name for ${target_folder_id}`)
                }
            }

            // Upsert into our database
            const { error } = await supabaseAdmin
                .from('clean_mail_rules')
                .upsert({
                    name,
                    sender_pattern,
                    keywords,
                    target_folder: target_folder_name,
                    is_active,
                    conditions: {
                        senders: sender_pattern ? [sender_pattern] : [],
                        keywords: keywords,
                        must_be_read: false // Default to false as requested for unread check
                    }
                }, { onConflict: 'name' }) // Use name as unique identifier for sync

            if (!error) syncedCount++
        }

        revalidatePath('/dashboard/rules')
        return { success: true, message: `Synced ${syncedCount} rules from Outlook.`, count: syncedCount }

    } catch (error: any) {
        console.error('Sync rules error:', error)
        return { success: false, message: error.message || 'Failed to sync rules' }
    }
}
