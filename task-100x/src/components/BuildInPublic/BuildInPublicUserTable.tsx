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
import { buildInPublic, UserData } from '@/lib/api';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  totalPosts: number;
  lastPosted: string | null;
  totalLikes: number;
  totalComments: number;
}

const BuildInPublicUserTable = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await buildInPublic.getUsers();
        console.log("API Response Data:", response); // Log the response data
        if (Array.isArray(response)) {
          setUsers(response);
        } else {
          console.error("API response is not an array:", response);
          setError("Unexpected API response format.");
        }
      } catch (e: any) {
        setError(e.message);
        toast({
          title: 'Error',
          description: e.response?.data?.detail || 'Failed to load users data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
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
            <TableCell><Link to={`/track-100x/${user.id}`}>{user.name}</Link></TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.totalPosts}</TableCell>
            <TableCell>{user.totalLikes}</TableCell>
            <TableCell>{user.totalComments}</TableCell>
            <TableCell>{user.lastPosted ? new Date(user.lastPosted).toLocaleDateString() : 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default BuildInPublicUserTable;