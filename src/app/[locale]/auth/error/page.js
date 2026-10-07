import { getTranslations } from "next-intl/server";
import AuthErrorClient from "./AuthErrorClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AuthError" });
  return {
    title: `${t("title")} | Unity 2.0`,
    description: t("subtitle"),
  };
}

export default async function AuthErrorPage({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error || "Configuration";

  return <AuthErrorClient locale={locale} initialError={error} />;
}
