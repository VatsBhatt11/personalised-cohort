import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { instructor } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Calendar } from "lucide-react";
import StreakCalendar from "@/components/BuildInPublic/StreakCalendar";

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  rank: number;
}

const UserAnalyticsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        // Assuming instructor.getUserStats is an API call that fetches the stats
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
    return <p>Loading user analytics...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!userStats) {
    return <p>No user stats found.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Analytics for {userId}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalPosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.currentStreak} days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.longestStreak} days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rank</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.rank}</div>
          </CardContent>
        </Card>
      </div>
      <h2 className="text-xl font-bold mb-4">Activity Heatmap</h2>
      <StreakCalendar userId={userId} />
    </div>
  );
};

export default UserAnalyticsPage;