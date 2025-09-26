import { useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import UserStatsCards from "@/components/BuildInPublic/UserStatsCards";
import StreakCalendar from "@/components/BuildInPublic/StreakCalendar";
import { useEffect, useState } from "react";
import { instructor } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

interface UserStats {
  name: string;
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  rank: number;
}

interface Post {
  id: string;
  url: string;
  postedAt: string;
  hasReacted: boolean;
}

const BuildInPublicUserDetailPage = () => {
  const { userId } = useParams();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "reacted" | "unreacted">("all");

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        try {
          setLoading(true);
          const [statsResponse, postsResponse] = await Promise.all([
            instructor.getUserStats(userId),
            instructor.getUserPosts(userId),
          ]);
          setUserStats(statsResponse);
          setPosts(postsResponse);
        } catch (error) {
          console.error("Failed to fetch user data", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch user data.",
          });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [userId]);

  const handleToggleReacted = async (postId: string, currentStatus: boolean) => {
    try {
      const response = await instructor.updatePostReactionStatus(postId, !currentStatus);
      if (response.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, hasReacted: !currentStatus } : post
          )
        );
      }
    } catch (error) {
      console.error("Failed to update post reaction status", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update post status.",
      });
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (filter === "reacted") {
      return post.hasReacted;
    } else if (filter === "unreacted") {
      return !post.hasReacted;
    } else {
      return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white text-black p-4">
        <Breadcrumb
          className="mb-4 text-orange-500"
          items={[
            { label: "Build in Public", link: "/admin/track-100x" },
            { label: userStats?.name ? userStats.name : "User Details", link: `/admin/track-100x/${userId}` },
          ]}
        />
        <h1 className="text-2xl font-bold mb-4 text-black">{userStats?.name ? `${userStats.name}'s` : "User"} Analytics</h1>
        <UserStatsCards userStats={userStats} />
        <StreakCalendar userId={userId} userStats={userStats} />

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">User Posts</h2>
          <div className="flex space-x-2 mb-4">
            <Button onClick={() => setFilter("all")} variant={filter === "all" ? "default" : "outline"}>All Posts</Button>
            <Button onClick={() => setFilter("reacted")} variant={filter === "reacted" ? "default" : "outline"}>Reacted Posts</Button>
            <Button onClick={() => setFilter("unreacted")} variant={filter === "unreacted" ? "default" : "outline"}>Unreacted Posts</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr No.</TableHead>
                <TableHead>Post URL</TableHead>
                <TableHead>Post Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post, index) => (
                <TableRow key={post.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell><a href={post.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a></TableCell>
                  <TableCell>{new Date(post.postedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Toggle
                      pressed={post.hasReacted}
                      onPressedChange={() => handleToggleReacted(post.id, post.hasReacted)}
                    >
                      {post.hasReacted ? "Reacted" : "Unreacted"}
                    </Toggle>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default BuildInPublicUserDetailPage;