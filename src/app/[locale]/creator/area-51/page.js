import { redirect } from "next/navigation";

/**
 * Legacy Area-51 Route Redirect to Project Cerberus
 */
export default async function Area51LegacyRedirect({ params }) {
    const { locale } = await params;
    redirect(`/${locale}/creator/project-cerberus`);
}
