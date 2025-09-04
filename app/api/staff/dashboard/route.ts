import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export const GET = async (req: NextRequest) => {
  if (req.method !== "GET") {
    return NextResponse.json(
      { success: false, message: "Method Not Allowed" },
      { status: 405 },
    );
  }

  const session = await getSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const isStaff = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      employee_id: session.user.employee_id,
      staff: true,
    },
  });

  if (!isStaff) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
      { status: 401 },
    );
  }

  let plans = await prisma.plan.findMany({
    where: { user_id: session.user.id },
    include: {
      task: {
        orderBy: {
          day_order: "asc",
        },
      },
    },
  });

  if (!plans) {
    plans = [];
  }

  return NextResponse.json(
    {
      success: true,
      user: session.user,
      plans: plans,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 },
  );
};
