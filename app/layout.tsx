import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://jobvacancybasket.co.ke"),
  title: {
    default: "Job Vacancy Basket - Your basket of job vacancies",
    template: "%s | Job Vacancy Basket"
  },
  description: "Your daily basket of fresh job vacancies in Kenya.",
  verification: {
    google: "wcKwst--ccmjhWm2Bv9HTfXDseU_qjZWRNMK5c7iM8k"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}