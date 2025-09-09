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
    <div className="user-stats-grid">
      {cardData.map((card, idx) => (
        <Card key={idx} className="user-stats-card">
          <CardContent className="user-stats-card-content">
            <div className="user-stats-header">
              <div className="user-stats-icon">{card.icon}</div>
              <div>
                <p className="user-stats-title">{card.title}</p>
                <h3 className="user-stats-value">
                  {isLoading ? (
                    <span className="loading-dots">...</span>
                  ) : (
                    <>
                      {card.value}
                      {card.unit && <span className="user-stats-unit">{card.unit}</span>}
                    </>
                  )}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserStatsCards;