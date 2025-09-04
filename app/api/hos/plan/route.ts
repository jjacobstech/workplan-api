import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

export const GET = async (req: NextRequest) => {
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
      permanent_secretary: true,
    },
  });

  if (!hos) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
      { status: 401 },
    );
  }

  const plans = await prisma.plan.findMany({
    where: {
      user_id: session.user.id,
    },
    orderBy: {
      week_order: "asc",
    },
    include: {
      task: {
        orderBy: {
          day_order: "asc",
        },
      },
    },
  });

  if (!plans) {
    return NextResponse.json(
      {
        success: false,
        message: "This plan does not exist",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      plans: plans,
      message: "Plan loaded successfully",
    },
    { status: 200 },
  );
};
