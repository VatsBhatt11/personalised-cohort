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

        <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-black">User Posts</h2>
          <div className="flex space-x-3 mb-6">
            <Button
              onClick={() => setFilter("all")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${filter === "all"
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
              `}
            >
              All Posts
            </Button>
            <Button
              onClick={() => setFilter("reacted")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${filter === "reacted"
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
              `}
            >
              Reacted Posts
            </Button>
            <Button
              onClick={() => setFilter("unreacted")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${filter === "unreacted"
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
              `}
            >
              Unreacted Posts
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr No.</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post URL</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post Date</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post, index) => (
                  <TableRow key={post.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline font-medium">
                        Link
                      </a>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(post.postedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                      <Toggle
                        pressed={post.hasReacted}
                        onPressedChange={() => handleToggleReacted(post.id, post.hasReacted)}
                        className={`h-8 px-4 rounded-full text-xs font-medium transition-colors ${post.hasReacted
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
                        `}
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
      </div>
    </AppLayout>
  );
};

export default BuildInPublicUserDetailPage;