import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RecruitingCenter from "@/components/analysis/global/RecruitingCenter";

export const metadata = {
    title: "Recruiting Center | Unity",
    description: "Find diamonds in the rough — identify candidate players from target kingdoms who match your top performers' behavioral fingerprint using vector similarity analysis.",
};

export default async function RecruitingCenterPage() {
    const session = await auth();
    if (!session?.user?.isMember) {
        redirect("/");
    }

    return <RecruitingCenter session={session} />;
}
