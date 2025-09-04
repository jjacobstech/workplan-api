import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { z, flattenError } from "zod";

const inputSchema = z.object({
  ministry_id: z.union([z.string(), z.number()]),
});

export const POST = async (req: NextRequest) => {
  if (req.method !== "POST") {
    return NextResponse.json(
      { success: false, message: "Method Not Allowed" },
      { status: 405 },
    );
  }

  const session = await getAdminSession("hos", req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const hos = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      employee_id: session.user.employee_id,
      head_of_service: true,
    },
  });

  if (!hos) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const input = inputSchema.safeParse(body);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        message: flattenError(input.error).fieldErrors, // Returns an object with validation errors
      },
      { status: 400 },
    );
  }

  const ministry = await prisma.ministry.findFirst({
    where: {
      id: +input.data.ministry_id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      department: { select: { id: true, name: true, unit: true } },
    },
    orderBy: { name: "asc" },
  });

  if (!ministry) {
    return NextResponse.json(
      { success: false, message: "ministry does not exist" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      user: session.user,
      ministry: ministry,
      message: "Ministry retrieved successfully",
    },
    { status: 200 },
  );
};
