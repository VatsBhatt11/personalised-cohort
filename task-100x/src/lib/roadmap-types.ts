export interface RoadmapItem {
  id: string;
  userId: string;
  session_name: string;
  week_number: number;
  lecture_number: number;
  module_name: string;
  project_based_msg: string;
  outcome_based_msg: string;
}

export interface GroupedRoadmap {
  [module_name: string]: {
    [week_number: number]: {
      [session_name: string]: RoadmapItem[];
    };
  };
}
