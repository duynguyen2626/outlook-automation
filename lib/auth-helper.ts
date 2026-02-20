import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Retrieves the access token for a given user from the Supabase database
 * Tokens are stored in the accounts table via NextAuth adapter
 * @param userId - The user ID to fetch the token for
 * @returns The access token, or null if not found
 */
export async function getAccessToken(userId: string): Promise<string | null> {
    try {
        const { data: account, error } = await supabaseAdmin
            .from('accounts')
            .select('access_token')
            .eq('user_id', userId)
            .eq('provider', 'azure-ad')
            .single()

        if (error) {
            console.error('Error fetching access token:', error)
            return null
        }

        if (!account?.access_token) {
            console.error('No access token found for user:', userId)
            return null
        }

        return account.access_token
    } catch (err) {
        console.error('Failed to get access token:', err)
        return null
    }
}
