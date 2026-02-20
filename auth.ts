import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
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
        MicrosoftEntraID({
            id: "azure-ad",
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
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

            // Fix type mismatch by ensuring nulls are converted to undefined
            session.user = {
                ...user,
                name: user.name ?? undefined,
                email: user.email ?? undefined,
                image: user.image ?? undefined,
            }
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
})
