import React, { useEffect, useState } from 'react';
import { learner, LeaderboardEntry } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { AxiosError } from 'axios';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ApiError {
  detail: string;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await learner.getLeaderboard();
        setLeaderboardData(response);
      } catch (error) {
        const axiosError = error as AxiosError<ApiError>;
        toast({
          title: 'Error',
          description: axiosError.response?.data?.detail || 'Failed to fetch leaderboard data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-orange-500">Loading Leaderboard...</div>;
  }

  return (
    <div className="p-6 bg-black text-white min-h-screen w-full">
      <h1 className="text-3xl font-bold mb-6 text-orange-500">Leaderboard</h1>
      <Table>
        <TableCaption>Top learners based on completion rate, daily streak, and weekly streak.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px] text-orange-400">Rank</TableHead>
            <TableHead className="text-orange-400">Email</TableHead>
            <TableHead className="text-orange-400">Completion Rate</TableHead>
            <TableHead className="text-orange-400">Daily Streak</TableHead>
            <TableHead className="text-orange-400">Weekly Streak</TableHead>
            <TableHead className="text-orange-400">Shortest Completion Time (s)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboardData?.map((entry, index) => (
            <TableRow key={entry.email}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{entry.email}</TableCell>
              <TableCell>{entry.completionRate.toFixed(2)}%</TableCell>
              <TableCell>{entry.dailyStreak}</TableCell>
              <TableCell>{entry.weeklyStreak}</TableCell>
              <TableCell>{entry.shortestCompletionTime === null ? 'N/A' : entry.shortestCompletionTime.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Leaderboard;