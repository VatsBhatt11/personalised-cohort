
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Star } from 'lucide-react';

import { WeekResource, WeeklyProgressResponse } from '@/lib/api';



interface GameRoadmapProps {
  onLevelClick: (weekId: number) => void;
  userName: string;
  weeklyProgress: WeeklyProgressResponse | null;
  allResources: WeekResource[];
}

interface Level {
  id: number;
  title: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  isActive: boolean;
  progress?: number;
}

const GameRoadmap = ({ onLevelClick, userName, weeklyProgress, allResources }: GameRoadmapProps) => {
  // Convert weeklyProgress object to an array for easier iteration
  const weeklyProgressArray = Object.entries(weeklyProgress?.weeklyProgress || {}).map(([week, data]) => ({
    week: parseInt(week),
    completedTasks: data.completed,
    totalTasks: data.total,
    progress: (data.completed / data.total) * 100,
  }));

  // Calculate level status based on weekly progress
  const calculateLevelStatus = (weekId: number) => {
    const weekData = weeklyProgressArray.find(w => w.week === weekId) || { completedTasks: 0, totalTasks: 0, progress: 0 };
    const previousWeekData = weeklyProgressArray.find(w => w.week === weekId - 1);
    
    const isUnlocked = weekId === 1 || (previousWeekData && previousWeekData.progress >= 70);
    const isCompleted = weekData.progress >= 100;
    const isActive = isUnlocked && !isCompleted;
    
    return {
      isUnlocked,
      isCompleted,
      isActive,
      progress: weekData.progress || 0
    };
  };

  const allWeeks = Array.from(new Set([...weeklyProgressArray.map(w => w.week), ...allResources.map(w => w.week)]));

  const levels: Level[] = allWeeks
    .map(weekId => {
      const weekData = weeklyProgressArray.find(w => w.week === weekId);
      const status = calculateLevelStatus(weekId);
      return {
        id: weekId,
        title: `Week ${weekId}`,
        ...status,
        progress: weekData ? status.progress : 0, // Use progress from weeklyProgress if available, else 0
      };
    })
    .sort((a, b) => b.id - a.id); // Sort in descending order of week number



  return (
    <div className="relative overflow-hidden bg-orange-100 h-full w-full">
      {/* Floating particles background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-orange-400/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Scrollable Path Container */}
      <div className="h-full overflow-y-auto z-20 overflow-x-hidden px-2 sm:px-4 pt-16 sm:pt-20 md:pt-24 pb-8 scrollbar-hide max-w-7xl mx-auto">
        <div className="mx-auto relative">
          {/* Enhanced SVG Paths - Snake-like curves */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ height: `${levels.length * 160}px`, width: '100%', maxWidth: '1200px', margin: '0 auto' }}
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(251,146,60,0.9)" />
                <stop offset="50%" stopColor="rgba(249,115,22,1)" />
                <stop offset="100%" stopColor="rgba(251,146,60,0.9)" />
              </linearGradient>
              <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {levels.map((level, index) => {
              if (index === 0) return null;
              
              const fromY = index * 160 + 80;
              const toY = (index - 1) * 160 + 80;
              
              const isCurrentLeft = index % 2 === 0;
              const isNextLeft = (index - 1) % 2 === 0;
              
              const containerWidth = 1200; // Max width of max-w-7xl (80rem = 1280px, using 1200 for simplicity)
              const horizontalPadding = 80; // Padding from the sides

              // Calculate x positions relative to the container's center
              const fromX = isCurrentLeft ? (containerWidth / 2) - horizontalPadding : (containerWidth / 2) + horizontalPadding;
              const toX = isNextLeft ? (containerWidth / 2) - horizontalPadding : (containerWidth / 2) + horizontalPadding;
              
              const midY = (fromY + toY) / 2;
              const horizontalDistance = Math.abs(fromX - toX);
              const controlOffset = horizontalDistance * (0.6 + Math.random() * 0.4);
              
              let pathData;
              if (isCurrentLeft !== isNextLeft) {
                const direction = fromX < toX ? 1 : -1;
                pathData = `M ${fromX} ${fromY} 
                           C ${fromX + (controlOffset * direction * 0.5)} ${fromY},
                             ${toX - (controlOffset * direction * 0.5)} ${toY},
                             ${toX} ${toY}`;
              } else {
                const midX = (fromX + toX) / 2;
                pathData = `M ${fromX} ${fromY} 
                           Q ${midX + (isCurrentLeft ? -50 : 50)} ${midY} 
                           ${toX} ${toY}`;
              }
              
              return (
                <g key={`path-group-${level.id}`}>
                  <path
                    d={pathData}
                    stroke="url(#pathGradient)"
                    strokeWidth="20"
                    fill="none"
                    opacity={0.6}
                    filter="url(#pathGlow)"
                    strokeLinecap="round"
                  />
                  
                  <path
                    d={pathData}
                    stroke="rgb(251, 190, 36)"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray="30,20"
                    opacity={0.5}
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;50;0"
                      dur="6s"
                      repeatCount="indefinite"
                    />
                  </path>
                  
                  <path
                    d={pathData}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="4"
                    fill="none"
                    opacity={0.6}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* Level Nodes */}
          <div className="relative z-20" style={{ height: `${levels.length * 160}px` }}>
            {levels.length > 0 ? (
              levels.map((level, index) => {
              const yPosition = index * 160;
              const isLeft = index % 2 === 0;
              const weekData = weeklyProgressArray.find(w => w.week === level.id);
              
              return (
                <div
                  key={level.id}
                  className="absolute transition-all duration-500 hover:scale-105"
                  style={{
                    top: `${yPosition}px`,
                    left: isLeft ? '20px' : 'auto',
                    right: isLeft ? 'auto' : '20px',
                    width: typeof window !== 'undefined' && window.innerWidth <= 768 ? 'calc(100% - 40px)' : '600px',
                  }}
                >
                  <div className={`
                    flex flex-row items-center gap-2 sm:gap-4 cursor-pointer transition-all duration-500 p-3 sm:p-4 rounded-3xl backdrop-blur-sm
                    w-full
                    ${level.isUnlocked
                      ? level.isCompleted
                        ? 'bg-cyan-500/20 border border-cyan-400/60 shadow-xl shadow-cyan-500/30'
                        : level.isActive
                          ? 'bg-orange-400 border-2 border-orange-500 shadow-2xl shadow-orange-500/40 ring-4 ring-orange-400/20'
                          : 'bg-orange-900/60 border border-orange-800/40 hover:border-orange-600/70 hover:shadow-xl hover:shadow-orange-500/30'
                      : 'bg-orange-950/60 border border-orange-800/40 opacity-70 cursor-not-allowed'
                    }
                  `}
                    onClick={() => {
                      if (level.isUnlocked) {
                        onLevelClick(level.id);
                      }
                    }}
                  >
                    {/* Level Node Circle */}
                    <div className={`
                      w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 transition-all duration-500 relative
                      ${level.isUnlocked
                        ? level.isCompleted
                          ? 'bg-gradient-to-br from-cyan-400/30 to-cyan-600/30 border-cyan-400 text-cyan-300 shadow-2xl shadow-cyan-500/40'
                          : level.isActive
                            ? 'border-orange-600 text-white bg-gradient-to-br from-orange-500 to-orange-400 shadow-2xl shadow-orange-500/50'
                            : 'border-orange-600/70 text-orange-100 bg-gradient-to-br from-orange-900/30 to-orange-950/30'
                        : 'border-orange-700 text-orange-200 bg-gradient-to-br from-orange-950/30 to-orange-900/30'
                      }
                    `}>
                      {level.isCompleted ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : level.isActive ? (
                        <>
                          {level.id}
                          <div className="absolute -inset-2 rounded-full border-2 border-orange-600 animate-ping" />
                        </>
                      ) : level.isUnlocked ? (
                        level.id
                      ) : (
                        <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>

                    {/* Level Content */}
                    <div className="flex-grow">
                      <h2 className="text-lg sm:text-xl font-bold text-white">{level.title}</h2>
                      {level.isUnlocked && (
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mr-2">
                            <div
                              className="bg-orange-500 h-2.5 rounded-full"
                              style={{ width: `${level.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-white">{Math.round(level.progress || 0)}%</span>
                        </div>
                      )}
                      {!level.isUnlocked && (
                        <p className="text-sm text-orange-300 mt-1">Complete previous levels to unlock</p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <Badge className={`
                      px-3 py-1 rounded-full text-xs sm:text-sm font-semibold
                      ${level.isCompleted
                        ? 'bg-cyan-500/30 text-cyan-300'
                        : level.isActive
                          ? 'bg-orange-600/30 text-white'
                          : 'bg-orange-900/30 text-orange-300'
                      }
                    `}>
                      {level.isCompleted ? 'Completed' : level.isActive ? 'In Progress' : 'Locked'}
                    </Badge>
                  </div>
                </div>
              );
            })
            ) : (
              <div className="text-center text-gray-500 text-lg mt-20">
                No weekly progress data available yet. Start your learning journey!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Styles */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(120deg); }
          66% { transform: translateY(5px) rotate(240deg); }
        }
      `}</style>
    </div>
  );
};

export default GameRoadmap;
