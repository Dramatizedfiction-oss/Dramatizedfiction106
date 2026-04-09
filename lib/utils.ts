export function requireRole(session, roles) {
  if (!session || !roles.includes(session.user?.role)) {
    throw new Error("Unauthorized");
  }
}
