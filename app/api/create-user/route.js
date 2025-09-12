"use server";

import { NextResponse } from "next/server"
import { Clerk } from "@clerk/clerk-sdk-node"

// Clerk client
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY })

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password } = body;

    // Check if user already exists
    const existingUsers = await clerk.users.getUserList({ username });
    if (existingUsers.length > 0) {
      return NextResponse.json({ user: existingUsers[0], alreadyExists: true });
    }

    // Otherwise, create a new user
    const user = await clerk.users.createUser({
      username,
      password,
    });

    return NextResponse.json({ user, alreadyExists: false });
  } catch (error) {
    console.error("Error handling Clerk user:", error);
    return NextResponse.json(
      { error: error.errors ?? error.message ?? "Error creating/fetching user" },
      { status: 500 }
    );
  }
}



