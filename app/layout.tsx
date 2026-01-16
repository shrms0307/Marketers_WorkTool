import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { NavbarProvider } from "@/components/layout/navbar-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { Providers } from './providers'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "마케팅 협업툴, 더바이럴",
  description: "더바이럴 마케팅 협업툴 스마트서비스입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <NavbarProvider>
                {children}
              </NavbarProvider>
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}