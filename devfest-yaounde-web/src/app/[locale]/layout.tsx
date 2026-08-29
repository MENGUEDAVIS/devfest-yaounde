import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { FloatingScrollbar } from "@/components/global/FloatingScrollbar";
import { Footer } from "@/components/global/Footer";
import { GlobalChrome } from "@/components/global/GlobalChrome";
import { SmoothScrollProvider } from "@/components/global/SmoothScrollProvider";
import { routing } from "@/i18n/routing";
import "../globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-google-sans-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DevFest Yaoundé",
  description: "DevFest Yaoundé — GDG Yaoundé",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <html
      lang={locale}
      className={`${googleSans.variable} ${googleSansCode.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning is scoped to <body> ONLY, and only because
        browser extensions (Grammarly is the confirmed culprit here — it
        injects data-new-gr-c-s-check-loaded / data-gr-ext-installed) mutate
        this element before React hydrates. Verified empirically: with those
        attributes simulated the warning appears, without them the console is
        clean — so there is no genuine mismatch being masked. React only
        suppresses one level deep, so real mismatches inside the tree still
        surface. See docs/setup/local-development.md.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-pill focus:bg-black02 focus:px-4 focus:py-2 focus:text-offwhite"
          >
            {t("skipToContent")}
          </a>
          <SmoothScrollProvider />
          <GlobalChrome />
          <FloatingScrollbar />
          {/*
            The chrome is fixed-position, so page content needs its own top
            offset. Hero sections apply their own generous top padding
            (§7b spacing), so this only needs to clear the bar itself.
          */}
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
