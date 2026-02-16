import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { supabase } from "@/lib/supabase"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
    session: {
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
            authorization: {
                params: {
                    scope: "openid profile email offline_access Mail.ReadWrite Mail.Send User.Read",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                // Store tokens in database via adapter, not in JWT
                token.sub = account.providerAccountId
            }
            return token
        },
        async session({ session, user }) {
            // Fetch access token from database
            const account = await supabase
                .from('accounts')
                .select('access_token, refresh_token, expires_at')
                .eq('user_id', user.id)
                .eq('provider', 'azure-ad')
                .single()

            if (account.data) {
                session.accessToken = account.data.access_token
                session.refreshToken = account.data.refresh_token
                session.expiresAt = account.data.expires_at
            }
            session.user = user
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/",
    },
})
