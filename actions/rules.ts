'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { Rule } from "@/types"

export async function createRuleAction(formData: Partial<Rule>) {
    try {
        const { error } = await supabaseAdmin
            .from('clean_mail_rules')
            .insert([{
                name: formData.name,
                description: formData.description,
                sender_pattern: formData.sender_pattern,
                keywords: formData.keywords || [],
                target_folder: formData.target_folder,
                is_active: true,
                categories: formData.categories || [],
                conditions: formData.conditions || {
                    senders: formData.sender_pattern ? [formData.sender_pattern] : [],
                    keywords: formData.keywords || [],
                    must_be_read: false,
                    unread_only: false
                }
            }])

        if (error) throw error

        revalidatePath('/dashboard/rules')
        return { success: true }
    } catch (error: any) {
        console.error('Error creating rule:', error)
        return { success: false, error: error.message }
    }
}

export async function updateRuleAction(id: string, formData: Partial<Rule>) {
    try {
        const { error } = await supabaseAdmin
            .from('clean_mail_rules')
            .update({
                name: formData.name,
                description: formData.description,
                sender_pattern: formData.sender_pattern,
                keywords: formData.keywords,
                target_folder: formData.target_folder,
                is_active: formData.is_active,
                categories: formData.categories,
                conditions: formData.conditions || {
                    senders: formData.sender_pattern ? [formData.sender_pattern] : [],
                    keywords: formData.keywords || [],
                    must_be_read: false,
                    unread_only: false
                }
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/rules')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating rule:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteRuleAction(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('clean_mail_rules')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/rules')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting rule:', error)
        return { success: false, error: error.message }
    }
}

export async function toggleRuleStatusAction(id: string, currentStatus: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('clean_mail_rules')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/rules')
        return { success: true }
    } catch (error: any) {
        console.error('Error toggling rule status:', error)
        return { success: false, error: error.message }
    }
}
export async function bulkSetUnreadOnlyAction(unreadOnly: boolean) {
    try {
        // Fetch all rules
        const { data: rules, error: fetchError } = await supabaseAdmin
            .from('clean_mail_rules')
            .select('*')

        if (fetchError) throw fetchError

        // Update each rule's conditions
        for (const rule of (rules as Rule[])) {
            const updatedConditions = {
                ...rule.conditions,
                unread_only: unreadOnly,
                must_be_read: unreadOnly ? false : rule.conditions.must_be_read
            }

            await supabaseAdmin
                .from('clean_mail_rules')
                .update({ conditions: updatedConditions })
                .eq('id', rule.id)
        }

        revalidatePath('/dashboard/rules')
        return { success: true, message: `Updated ${rules.length} rules to ${unreadOnly ? 'Unread Only' : 'All Messages'}` }
    } catch (error: any) {
        console.error('Error in bulk update:', error)
        return { success: false, error: error.message }
    }
}

import { runRuleNow } from "@/actions/scan"

export async function triggerAllActiveRulesAction() {
    try {
        const { data: rules, error } = await supabaseAdmin
            .from('clean_mail_rules')
            .select('id')
            .eq('is_active', true)

        if (error) throw error

        let movedCount = 0
        let successCount = 0

        for (const rule of rules) {
            const result = await runRuleNow(rule.id)
            if (result.success) {
                const moved = (result as any).moved || 0
                movedCount += moved
                successCount++
            }
        }

        return {
            success: true,
            message: `Executed ${successCount} active rules. Total emails moved: ${movedCount}`
        }
    } catch (error: any) {
        console.error('Error triggering rules:', error)
        return { success: false, error: error.message }
    }
}
