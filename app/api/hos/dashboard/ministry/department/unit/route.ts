import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { z, flattenError } from "zod";

const inputSchema = z.object({
  ministry_id: z.union([z.string(), z.number()]),
  department_id: z.union([z.string(), z.number()]),
  unit_id: z.union([z.string(), z.number()]),
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

  const unit = await prisma.unit.findFirst({
    where: {
      id: +input.data.unit_id,
      department_id: +input.data.department_id,
      ministry_id: +input.data.ministry_id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      user: true,
    },
    orderBy: { name: "asc" },
  });

  if (!unit) {
    return NextResponse.json(
      { success: false, message: "unit does not exist" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      user: session.user,
      unit: unit,
      message: "Unit retrieved successfully",
    },
    { status: 200 },
  );
};
