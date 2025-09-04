import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { z, flattenError } from "zod";

const inputSchema = z.object({
  department_id: z.string(),
});

export const POST = async (req: NextRequest) => {
  if (req.method !== "POST") {
    return NextResponse.json(
      { success: false, message: "Method Not Allowed" },
      { status: 405 },
    );
  }

  const session = await getAdminSession("ps", req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const ps = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      employee_id: session.user.employee_id,
      permanent_secretary: true,
    },
  });

  if (!ps) {
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

  const departments = await prisma.department.findFirst({
    where: {
      id: +input.data.department_id,
      ...(ps.ministry_id && { ministry_id: ps.ministry_id }),
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  const units = await prisma.unit.findMany({
    where: {
      department_id: +input.data.department_id,
      ...(ps.ministry_id && { ministry_id: ps.ministry_id }),
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  if (!units) {
    return NextResponse.json(
      { success: false, message: "Department does not exist" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      user: session.user,
      Department: departments,
      units: units,
      message: "Department retrieved successfully",
    },
    { status: 200 },
  );
};
