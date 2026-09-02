"use client";

/**
 * The last resort: an error thrown by the ROOT layout itself.
 *
 * At that point no provider, no translation and no stylesheet can be assumed
 * to have loaded — which is why this replaces the whole document, carries its
 * own <html> and <body>, and is styled with inline properties only. It is
 * bilingual for the same reason the root 404 is: there is no locale context
 * left to choose from.
 *
 * In development Next shows its own overlay instead, so this is only ever
 * seen in production. That is exactly when it matters most.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
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
            500
          </p>
          <h1
            style={{
              fontSize: "2.5rem",
              lineHeight: 1.05,
              margin: "1.25rem 0 0",
            }}
          >
            Quelque chose a lâché. / Something gave out.
          </h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.5, opacity: 0.8 }}>
            Réessaie — et si ça recommence, on veut le savoir. / Try again — and
            if it keeps happening, we want to know.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              border: "2px solid #1E1E1E",
              borderRadius: 999,
              background: "#F9AB00",
              color: "#1E1E1E",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 0 0 #1E1E1E",
            }}
          >
            Réessayer / Try again
          </button>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                opacity: 0.7,
              }}
            >
              ref. {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
