export type AppShellUser = {
  role?: string | null;
} | null;

export type NavigationItem = {
  href: string;
  label: string;
  section: "discover" | "writer" | "ceo";
};

export function getNavigationItems(user: AppShellUser): NavigationItem[] {
  const items: NavigationItem[] = [
    { href: "/", label: "Home", section: "discover" },
    { href: "/explore", label: "Explore", section: "discover" },
  ];

  if (user && ["AUTHOR", "ADMIN", "CEO"].includes(user.role ?? "")) {
    items.push(
      { href: "/writer", label: "Dashboard", section: "writer" },
      { href: "/writer/series", label: "Your Series", section: "writer" },
      { href: "/writer/episodes", label: "Episodes", section: "writer" },
      { href: "/writer/stats", label: "Stats", section: "writer" },
    );
  }

  if (user?.role === "CEO") {
    items.push(
      { href: "/ceo", label: "CEO Dashboard", section: "ceo" },
      { href: "/ceo/settings", label: "Settings", section: "ceo" },
      { href: "/ceo/users", label: "Users", section: "ceo" },
      { href: "/ceo/analytics", label: "Analytics", section: "ceo" },
    );
  }

  return items;
}
