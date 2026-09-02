import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CustomCursor } from "@/components/global/CustomCursor";
import { FloatingScrollbar } from "@/components/global/FloatingScrollbar";
import { Footer } from "@/components/global/Footer";
import { GlobalChrome } from "@/components/global/GlobalChrome";
import { SmoothScrollProvider } from "@/components/global/SmoothScrollProvider";
import { routing } from "@/i18n/routing";
import { organizationJsonLd } from "@/lib/event";
import { JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    /* Resolves relative OG/Twitter image paths. Without it Next falls back to
       localhost, which would ship broken social previews. */
    metadataBase: new URL(SITE_URL),
    /* Every page supplies its bare title and gets the suffix from here, so
       "Billets" becomes "Billets · DevFest Yaoundé" without twelve copies of
       the string — and the home page, which IS the name, does not end up
       saying it twice. */
    title: {
      default: "DevFest Yaoundé",
      template: "%s · DevFest Yaoundé",
    },
    description: t("metaDesc"),
    applicationName: "DevFest Yaoundé",
  };
}

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
      // The pre-paint script above sets data-theme here before hydration,
      // so <html>'s attributes legitimately differ from the server render.
      suppressHydrationWarning
    >
      <head>
        {/*
          Applies the saved theme BEFORE first paint, so a visitor who chose
          e.g. Blue never sees a flash of the default Yellow. Has to be a raw
          inline script for that ordering — a client component would run
          after hydration, far too late. Content is built from a fixed
          allow-list in @/lib/theme, never from user input.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Who runs this, on every page. Nothing here is speculative, so
            unlike the Event block it is always emitted. */}
        <JsonLd data={organizationJsonLd()} />
      </head>
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
          <CustomCursor />
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
