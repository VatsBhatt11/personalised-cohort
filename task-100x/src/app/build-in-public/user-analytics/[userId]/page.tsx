"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { instructor } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StreakCalendar from "@/components/BuildInPublic/StreakCalendar";

interface UserStats {
  totalPosts: number;
  currentStreak: number;
  longestStreak: number;
}

const UserAnalyticsPage = () => {
  const { userId } = useParams();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const stats = await instructor.getUserStats(userId as string);
        setUserStats(stats);
      } catch (err: Error) {
        console.error("Failed to fetch user stats:", err);
        setError("Failed to load user analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [userId]);

  if (loading) {
    return <div className="p-4">Loading user analytics...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!userStats) {
    return <div className="p-4">No user data found.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Analytics for {userId}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userStats.totalPosts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userStats.currentStreak} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Longest Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userStats.longestStreak} days</p>
          </CardContent>
        </Card>
      </div>
      <StreakCalendar userId={userId as string} />
    </div>
  );
};

export default UserAnalyticsPage;