"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Calendar, Flag } from "lucide-react";
import '../../styles/userStatsCards.css'

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  rank: number;
}

interface UserStatsCardsProps {
  userId?: string; // Make userId optional
}

const UserStatsCards = ({ userId }: UserStatsCardsProps) => {
  const [stats, setStats] = useState<UserStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalPosts: 0,
    rank: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStats();
  }, [userId]); // Add userId to dependency array

  const fetchUserStats = async () => {
    try {
      const { data } = await axios.get<UserStats>(`/api/build-in-public/users/${userId}/analytics`);
      setStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Failed to load user stats');
    } finally {
      setIsLoading(false);
    }
  };

  const cardData = [
    {
      title: "Current Streak",
      value: stats.currentStreak,
      unit: "days",
      icon: <Calendar size={24} color="#f97316" />,
    },
    {
      title: "Longest Streak",
      value: stats.longestStreak,
      unit: "days",
      icon: <Star size={24} color="#f97316" />,
    },
    {
      title: "Total Posts",
      value: stats.totalPosts,
      unit: "",
      icon: <Flag size={24} color="#f97316" />,
    },
    {
      title: "Current Rank",
      value: `#${stats.rank}`,
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