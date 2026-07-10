import { getCookie, useSession } from "@tanstack/react-start/server";

const SESSION_NAME = "nawras_dash";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

type DashSession = { authed?: boolean };

function sessionConfig() {
  return {
    password: process.env.SESSION_SECRET!,
    name: SESSION_NAME,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

export async function requireDashAuth() {
  const raw = getCookie(SESSION_NAME);
  if (!raw) throw new Error("Unauthorized");
  const session = await useSession<DashSession>(sessionConfig());
  if (!session.data.authed) throw new Error("Unauthorized");
}