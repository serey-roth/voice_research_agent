import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { getUserUsageSeconds } from '@/lib/db'
import PendoInitializer from '@/app/components/PendoInitializer'
import './globals.css'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    title: 'VoiceScope',
    description: 'Turn user interviews into actionable research.',
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const { userId } = await auth()
    const usageSeconds = userId ? await getUserUsageSeconds(userId) : 0

    return (
        <ClerkProvider afterSignOutUrl="/sign-in">
            <html
                lang="en"
                className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            >
                <head>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('db9c96ca-b045-4c61-a1d2-011e07267b3e');`,
                        }}
                    />
                </head>
                <body className="min-h-full flex flex-col">
                    <PendoInitializer usageSeconds={usageSeconds} />
                    {children}
                </body>
            </html>
        </ClerkProvider>
    )
}
