import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function DpGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.dpGenerator");

  return (
    <main
      id="main-content"
      className="flex-1 flex items-center justify-center p-8"
    >
      <div className="text-center max-w-2xl">
        <h1 className="text-display-l font-bold text-black02">{t("title")}</h1>
        <p className="text-body-l mt-4 text-black02">{t("placeholder")}</p>
      </div>
    </main>
  );
}
