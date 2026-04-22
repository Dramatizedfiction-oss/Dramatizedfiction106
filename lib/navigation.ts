export type AppShellUser = {
  role?: string | null;
} | null;

export type TrendingStory = {
  id: string;
  title: string;
  description?: string | null;
  reads?: number;
};

export type UtilityItem = {
  href: string;
  label: string;
  description: string;
};

export function getUtilityItems(): UtilityItem[] {
  return [
    {
      href: "/settings",
      label: "Settings",
      description: "Theme, reading preferences, and account controls.",
    },
    {
      href: "/about",
      label: "About Platform",
      description: "What Dramatized Fiction is building and why it exists.",
    },
    {
      href: "/ai-usage",
      label: "AI Usage",
      description: "How AI is used across the platform and creator workflows.",
    },
  ];
}
