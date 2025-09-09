"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Calendar, Flag } from "lucide-react";
import '../../styles/userStatsCards.css'
import { instructor } from "@/lib/api";

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  rank: number;
}

interface UserStatsCardsProps {
  userStats: UserStats | null;
}

const UserStatsCards = ({ userStats }: UserStatsCardsProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userStats) {
      setIsLoading(false);
    } else {
      setError("User stats not available.");
      setIsLoading(false);
    }
  }, [userStats]);

  const cardData = [
    {
      title: "Current Streak",
      value: userStats?.currentStreak,
      unit: "days",
      icon: <Calendar size={24} color="#f97316" />,
    },
    {
      title: "Longest Streak",
      value: userStats?.longestStreak,
      unit: "days",
      icon: <Star size={24} color="#f97316" />,
    },
    {
      title: "Total Posts",
      value: userStats?.totalPosts,
      unit: "",
      icon: <Flag size={24} color="#f97316" />,
    },
    {
      title: "Current Rank",
      value: `#${userStats?.rank}`,
      unit: "",
      icon: <Trophy size={24} color="#f97316" />,
    },
  ];

  if (error) {
    return (
      <div className="error-message">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cardData.map((card, idx) => (
        <Card key={idx} className="bg-white text-black border-orange-500 shadow-md">
          <CardContent className="flex items-center p-4">
            <div className="mr-4 text-orange-500">{card.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <h3 className="text-2xl font-bold text-black mt-1">
                {isLoading ? (
                  <span className="loading-dots text-orange-500">...</span>
                ) : (
                  <>
                    {card.value}
                    {card.unit && <span className="text-base font-normal text-gray-500 ml-1">{card.unit}</span>}
                  </>
                )}
              </h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserStatsCards;