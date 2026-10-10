/** Landmark illustrations a milestone pad can show on the journey map (components/roadmap/Landmarks.tsx). */
export const LANDMARKS = ["flag", "school", "campus", "code", "office", "trophy", "rocket"] as const;
export type Landmark = (typeof LANDMARKS)[number];

export const LANDMARK_LABELS: Record<Landmark, string> = {
  flag: "Flag",
  school: "School house",
  campus: "University campus",
  code: "Laptop / code",
  office: "Office tower",
  trophy: "Trophy",
  rocket: "Rocket",
};

export const isLandmark = (v: string): v is Landmark => (LANDMARKS as readonly string[]).includes(v);
