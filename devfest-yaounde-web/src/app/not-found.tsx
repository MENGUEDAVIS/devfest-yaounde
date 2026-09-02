import Link from "next/link";
import { routing } from "@/i18n/routing";

/**
 * The 404 for anything that never reaches a locale.
 *
 * The proxy sends bare paths to `/fr/...`, so almost every miss is caught by
 * the localised page one level down. This is the backstop for the cases that
 * skip the proxy entirely — a malformed URL, a request with the locale
 * segment stripped by something in front of the app.
 *
 * DELIBERATELY SELF-CONTAINED: no translations (there is no locale to pick
 * one), no site chrome (the locale layout is what provides it), and both
 * languages side by side rather than a guess at which one to show. Written in
 * plain inline styles for the same reason — this page has to render even if
 * something in the app's own CSS pipeline is what broke.
 */
export const metadata = {
  title: "404 · DevFest Yaoundé",
  robots: { index: false },
};

export default function RootNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFE7A5",
          color: "#1E1E1E",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              display: "inline-block",
              margin: 0,
              padding: "0.4rem 1rem",
              border: "2px solid #1E1E1E",
              borderRadius: 999,
              background: "#F0F0F0",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            404
          </p>
          <h1
            style={{
              fontSize: "2.5rem",
              lineHeight: 1.05,
              margin: "1.25rem 0 0",
            }}
          >
            Cette page a pris un café. / This page took a coffee break.
          </h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.5, opacity: 0.8 }}>
            Le lien ne mène nulle part. / That link doesn&apos;t go anywhere.
          </p>
          <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {routing.locales.map((locale) => (
              <Link
                key={locale}
                href={`/${locale}`}
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  border: "2px solid #1E1E1E",
                  borderRadius: 999,
                  background: "#F9AB00",
                  color: "#1E1E1E",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 0 0 #1E1E1E",
                }}
              >
                {locale === "fr"
                  ? "Retour à l'accueil"
                  : "Back to the home page"}
              </Link>
            ))}
          </p>
        </main>
      </body>
    </html>
  );
}
