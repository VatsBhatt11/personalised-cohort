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
    <div className="p-6 bg-white text-black min-h-screen w-full rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-black">Leaderboard</h1>
      <Table className="bg-orange-100 rounded-lg overflow-hidden">
        <TableCaption className="text-black">Top learners based on completion rate, and weekly streak.</TableCaption>
        <TableHeader>
          <TableRow className="bg-orange-50">
            <TableHead className="w-[150px] text-black">Rank</TableHead>
            <TableHead className="text-black">Email</TableHead>
            <TableHead className="text-black">Completion Rate</TableHead>
            {/* <TableHead className="text-orange-400">Daily Streak</TableHead> */}
            <TableHead className="text-orange-300">Weekly Streak</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboardData?.map((entry, index) => (
            <TableRow key={entry.email} className="hover:bg-orange-200">
              <TableCell className="font-medium text-black">{index + 1}</TableCell>
              <TableCell className="text-black">{entry.email}</TableCell>
              <TableCell className="text-black">{entry.completionRate.toFixed(2)}%</TableCell>
              {/* <TableCell>{entry.dailyStreak}</TableCell> */}
              <TableCell className="text-black">{entry.weeklyStreak}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Leaderboard;