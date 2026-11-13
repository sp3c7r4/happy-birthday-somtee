import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Happy Birthday, Somto!",
  description: "A birthday celebration for Somto Ezepue, Founder and CEO of Arthurite Integrated, from the whole team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}
