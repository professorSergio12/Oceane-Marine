import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    response.headers.set(
      "Set-Cookie",
      `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; ${
        process.env.NODE_ENV === "production" ? "Secure" : ""
      }`
    );

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
