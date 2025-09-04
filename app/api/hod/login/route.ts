import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z, flattenError } from "zod";
import { createSession } from "@/lib/session";

// -----------------------------
// Zod schema for login form validation
// -----------------------------
const LoginSchema = z.object({
  employee_id: z.string().trim(), // Employee ID as a string, trimming whitespace
  password: z.string().min(6).trim(), // Password must be at least 6 characters, trimming whitespace
});

// -----------------------------
// Main login handler
// -----------------------------
export const POST = async (req: NextRequest) => {
  //  Method check - Only allow POST requests
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed", success: false },
      { status: 405 },
    );
  }

  //  Parse request body as JSON
  const body = await req.json();

  //  Validate request body against LoginSchema
  const creds = LoginSchema.safeParse(body);

  //  If validation fails, return error with field-specific messages
  if (!creds.success) {
    return NextResponse.json(
      {
        success: false,
        message: flattenError(creds.error).fieldErrors, // Returns an object with validation errors
      },
      { status: 400 },
    );
  }

  //  Extract validated credentials
  const employee_id = creds.data.employee_id;
  const password = creds.data.password;

  //  Look for user in the database
  const user = await prisma.user.findUnique({
    where: {
      employee_id: employee_id,
      head_of_department: true,
    },
  });

  //  If user not found, return generic error (no user enumeration)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "User not found",
      },
      { status: 404 },
    );
  }

  // Compare provided password with stored hashed password
  const validPassword = await bcrypt.compare(password, user.password);

  // If password mismatch, return same generic error
  if (!validPassword) {
    return NextResponse.json(
      {
        success: false,
        message: "invalid employeeId or password",
      },
      { status: 404 },
    );
  }

  // If login is valid, create a new session
  const session = await createSession(user.id, req);

  // Return success response with session data
  return NextResponse.json(
    {
      success: true,
      message: session,
    },
    { status: 200 },
  );
};
