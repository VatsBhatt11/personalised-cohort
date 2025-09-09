"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import '@/styles/streakCalendar.css'
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  getDay,
  addMonths,
  subMonths,
  subDays,
  startOfWeek,
} from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/components/ui/use-toast';

interface ActivityData {
  [date: string]: number;
}

interface StreakCalendarProps {
  userId: string; 
}

const StreakCalendar = ({ userId }: StreakCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [streakData, setStreakData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startDate = startOfMonth(subMonths(currentDate, 5));
  const endDate = endOfMonth(currentDate);

  useEffect(() => {
    fetchActivityData();
  }, [currentDate, userId]); 

  const fetchActivityData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = await axios.get<ActivityData>(`/api/build-in-public/users/${userId}/heatmap`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const activityMap = new Map(Object.entries(data));
      setStreakData(activityMap);
    } catch (e: Error) {
      console.error('Error fetching activity data:', e);
      setError('Failed to load activity data');
      toast({
        title: 'Error',
        description: e.message || 'Failed to load activity data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const getActivityLevel = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const count = streakData.get(dateKey) || 0;
    
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    return 3; 
  };

  const getActivityCount = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const count = streakData.get(dateKey) || 0;
    
    return count; 
  };

  const getCurrentStreak = () => {
    let streak = 0;
    let today = new Date();

    while (true) {
      const dateKey = format(today, "yyyy-MM-dd");
      const count = streakData.get(dateKey) || 0;

      if (count > 0) {
        streak++;
        today = subDays(today, 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const getLongestStreak = () => {
    const sortedDates = Array.from(streakData.keys()).sort();
    let longest = 0;
    let current = 0;

    for (const dateKey of sortedDates) {
      const count = streakData.get(dateKey) || 0;
      if (count > 0) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }

    return longest;
  };

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();

  const months = Array.from({ length: 6 }, (_, i) => {
    const month = addMonths(startDate, i);
    return { date: month, name: format(month, "MMM") };
  });

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const renderCalendar = () => {
    return (
      <div className="calendar-container">
        <div className="calendar-flex">
          <div className="weekday-labels">
            <div className="month-label-placeholder" />
            {weekdays.map((day) => (
              <div key={day} className="weekday">
                <span>{day}</span>
              </div>
            ))}
          </div>

          <div className="month-blocks">
            {months.map((month) => {
              const monthStart = startOfMonth(month.date);
              const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });

              const days: Date[][] = Array.from({ length: 7 }, () => Array(7).fill(null));
              let dayCursor = calendarStart;

              for (let week = 0; week < 7; week++) {
                for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                  const adjustedIndex = (getDay(dayCursor) + 6) % 7;
                  days[adjustedIndex][week] = new Date(dayCursor);
                  dayCursor = subDays(dayCursor, -1); 
                }
              }

              return (
                <div key={month.name} className="month-column">
                  <div className="month-label">{month.name}</div>

                  {weekdays.map((_, dayIndex) => (
                    <div key={`row-${dayIndex}`} className="week-row">
                      {Array(7)
                        .fill(0)
                        .map((_, weekIndex) => {
                          const day = days[dayIndex][weekIndex];
                          if (day && day.getMonth() === month.date.getMonth()) {
                            const level = getActivityLevel(day);
                            const count = getActivityCount(day);
                            const postText =
                            count === 0
                                ? "No posts"
                                : count === 1
                                ? "1 post"
                                : `${count} posts`;

                            return (
                              <TooltipProvider key={`tooltip-${day.toISOString()}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(`activity-cell level-${level}`)}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{format(day, "MMM d")}: {postText}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          return <div key={`empty-${dayIndex}-${weekIndex}`} className="empty-cell" />;
                        })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="legend">
          <span>Learn how we count contributions</span>
          <div className="legend-colors">
            <span>Less</span>
            <div className="legend-box level-0" />
            <div className="legend-box level-1" />
            <div className="legend-box level-2" />
            <div className="legend-box level-3" />
            <span>More</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="calendar-card">
      <CardHeader className="calendar-header">
        <CardTitle className="calendar-title">
          <span>Your Posting Streak</span>
          <div className="streak-metrics">
            <div className="metric">
              <span className="metric-label">Current</span>
              <span className="metric-value">{currentStreak} days</span>
            </div>
            <div className="metric">
              <span className="metric-label">Longest</span>
              <span className="metric-value">{longestStreak} days</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="calendar-controls">
          <Button 
            variant="outline" 
            size="icon" 
            className="nav-button" 
            onClick={goToPreviousMonth}
            disabled={isLoading}
          >
            <ChevronLeft />
          </Button>
          <span className="calendar-range">
            {format(startDate, "MMM yyyy")} – {format(endDate, "MMM yyyy")}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            className="nav-button" 
            onClick={goToNextMonth}
            disabled={isLoading}
          >
            <ChevronRight />
          </Button>
        </div>
        
        {error ? (
          <div className="error-message">{error}</div>
        ) : isLoading ? (
          <div className="loading-message">Loading activity data...</div>
        ) : (
          renderCalendar()
        )}
      </CardContent>
    </Card>
  );
};

export default StreakCalendar;
