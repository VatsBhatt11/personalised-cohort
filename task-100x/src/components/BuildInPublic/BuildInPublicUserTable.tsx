import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { instructor } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  totalPosts: number;
  lastPosted: string | null;
  totalLikes: number;
  totalComments: number;
}

interface BuildInPublicUserTableProps {
  cohortId: string;
}

const BuildInPublicUserTable = ({ cohortId }: BuildInPublicUserTableProps) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedinCookie, setLinkedinCookie] = useState("");
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!cohortId) return; // Only fetch if cohortId is available
      try {
        setLoading(true);
        const response = await instructor.getBuildInPublicUsers(cohortId);
        setUsers(response);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Failed to fetch users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [cohortId]);

  const handleFetchLinkedInPosts = async () => {
    setIsFetchingPosts(true);
    try {
      const response = await instructor.fetchLinkedInPosts(linkedinCookie);
      toast({
        title: "Success",
        description: "LinkedIn posts fetched and updated successfully!",
      });
    } catch (error) {
      console.error("Error fetching LinkedIn posts:", error);
      toast({
        variant: "destructive",
        title: "Error fetching LinkedIn posts",
        description: error.response?.data?.detail || "Failed to fetch LinkedIn posts.",
      });
    } finally {
      setIsFetchingPosts(false);
    }
  };

  const handleDownloadCSV = () => {
    if (users.length === 0) {
      toast({
        title: "Info",
        description: "No data to download.",
      });
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Email",
      "Total Posts",
      "Last Posted",
      "Total Likes",
      "Total Comments",
    ];
    const csvRows = [];

    csvRows.push(headers.join(","));

    users.forEach((user) => {
      const row = [
        user.id,
        user.name || "",
        user.email || "",
        user.totalPosts,
        user.lastPosted || "",
        user.totalLikes,
        user.totalComments,
      ];
      csvRows.push(row.map((field) => `"${field}"`).join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "admin_users_data.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Success",
        description: "User data downloaded as CSV!",
      });
    }
  };

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <>
      <div className="flex items-center space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Enter LinkedIn Cookie"
          value={linkedinCookie}
          onChange={(e) => setLinkedinCookie(e.target.value)}
          className="flex-grow bg-white"
        />
        <Button onClick={handleFetchLinkedInPosts} disabled={isFetchingPosts}>
          {isFetchingPosts ? "Fetching..." : "Fetch LinkedIn Posts"}
        </Button>
        <Button onClick={handleDownloadCSV}>Download User Data (CSV)</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Total Posts</TableHead>
              <TableHead>Total Likes</TableHead>
              <TableHead>Total Comments</TableHead>
              <TableHead>Last Posted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell><Link to={`/admin/track-100x/${user.id}?userName=${encodeURIComponent(user.name || '')}`} className="text-orange-500 hover:underline">{user.name}</Link></TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.totalPosts}</TableCell>
                <TableCell>{user.totalLikes}</TableCell>
                <TableCell>{user.totalComments}</TableCell>
                <TableCell>{user.lastPosted ? new Date(user.lastPosted).toLocaleDateString() : 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default BuildInPublicUserTable;