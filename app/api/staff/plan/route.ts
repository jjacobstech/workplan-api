import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const GET = async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
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
