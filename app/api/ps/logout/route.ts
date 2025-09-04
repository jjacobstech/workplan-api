"use server";
import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { flattenError, z } from "zod";
// import prisma from "@/lib/prisma";

const logout = z.object({
  id: z.union([z.number(), z.string()]),
});

export const POST = async (req: NextRequest) => {
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed", success: false },
      { status: 405 },
    );
  }

  const body = await req.json();
  const input = logout.safeParse(body);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        message: flattenError(input.error).fieldErrors,
        input: body,
      },
      { status: 400 },
    );
  }

  const id = parseInt(`${input.data.id}`);

  const session = await destroySession(id, req);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to get session",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: session.success,
      message: "logged out successfully",
      user: session.user,
    },
    { status: 200 },
  );
};
