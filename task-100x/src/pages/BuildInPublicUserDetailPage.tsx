import { useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import UserStatsCards from "@/components/BuildInPublic/UserStatsCards";
import StreakCalendar from "@/components/BuildInPublic/StreakCalendar";
import { useEffect, useState } from "react";
import { instructor } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

interface UserStats {
  name: string;
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  rank: number;
}

const BuildInPublicUserDetailPage = () => {
  const { userId } = useParams();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const response = await instructor.getUserStats(userId);
        setUserStats(response);
      } catch (err) {
        console.error("Error fetching user stats:", err);
        setError("Failed to load user stats.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user stats.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [userId, toast]);

  if (loading) {
    return <p>Loading user details...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: "Build in Public", link: "/admin/track-100x" },
            { label: userStats?.name ? userStats.name : "User Details", link: `/admin/track-100x/${userId}` },
          ]}
        />
        <h1 className="text-2xl font-bold mb-4">{userStats?.name ? `${userStats.name}'s` : "User"} Analytics</h1>
        <UserStatsCards userStats={userStats} />
        <StreakCalendar userId={userId} userStats={userStats} />
      </div>
    </AppLayout>
  );
};

export default BuildInPublicUserDetailPage;