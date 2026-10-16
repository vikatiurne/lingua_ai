import type { Metadata } from "next";
import { Lora, Mulish } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const mulish = Mulish({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Lingua AI",
  description: "Personalized English learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${mulish.variable} ${lora.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
