import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppChrome from "../components/AppChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://leoteor.com"),
  title: {
    default: "LEOTEOR | Telecom Marketplace",
    template: "%s | LEOTEOR",
  },
  description:
    "Modern telecom marketplace for customers, contractors, crews, insurance, certifications, and compliance workflows.",
  applicationName: "LEOTEOR Telecom Marketplace",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "LEOTEOR | Telecom Marketplace",
    description:
      "Modern telecom marketplace for customers, contractors, crews, insurance, certifications, and compliance workflows.",
    siteName: "LEOTEOR",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "LEOTEOR logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "LEOTEOR | Telecom Marketplace",
    description:
      "Modern telecom marketplace for customers, contractors, crews, insurance, certifications, and compliance workflows.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#F4F8FC] text-[#111827] antialiased`}
      >
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}