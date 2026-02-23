import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import User from "@/lib/mongodb/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectDB();

    const { employeeId, password } = await req.json();
    const user = await User.findOne({ employeeId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    const userObj = user.toObject();
    delete userObj.password;

    const response = NextResponse.json(
      { message: "Login successful", user: userObj },
      { status: 200 }
    );

    // Set cookie using Response API (Next.js 14+)
    response.headers.set(
      "Set-Cookie",
      `access_token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax; ${
        process.env.NODE_ENV === "production" ? "Secure" : ""
      }`
    );

    return response;
  } catch (error) {
    console.log("LOGIN ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
