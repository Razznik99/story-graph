
import { NextAuthOptions } from "next-auth"
import FacebookProvider from "next-auth/providers/facebook"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        // OAuth authentication providers...
        FacebookProvider({
            clientId: process.env.FACEBOOK_ID ?? "",
            clientSecret: process.env.FACEBOOK_SECRET ?? ""
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_ID ?? "",
            clientSecret: process.env.GOOGLE_SECRET ?? ""
        }),
        // Passwordless / email sign in
        EmailProvider({
            from: process.env.MAIL_FROM ?? "noreply@story-graph.com",
            sendVerificationRequest({ identifier, url }) {
                return sendEmail({
                    to: identifier,
                    subject: 'Sign in to Story Graph',
                    html: `
                        <p>Click the link below to sign in.</p>
                        <p>This link expires in 10 minutes.</p>
                        <a href="${url}">${url}</a>
                    `,
                })
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                (session.user as any).id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        }
    },
    pages: {
        signIn: '/login',
    },
}
