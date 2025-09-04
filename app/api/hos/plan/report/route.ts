import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import z, { flattenError } from "zod";

const months = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const weeks = ["WEEK_1", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5"] as const;

const planSchema = z.object({
  month: z.enum(months),
  week: z.enum(
    weeks,
    "Invalid Week: Only ['WEEK_1', 'WEEK_2', 'WEEK_3', 'WEEK_4', 'WEEK_5'] are allowed",
  ),
});

export const POST = async (req: NextRequest) => {
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

  const body = await req.json();
  const input = planSchema.safeParse(body);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        message: flattenError(input.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = input.data;

  const plan = await prisma.plan.findFirst({
    where: {
      user_id: session.user.id,
      week: data.week,
      week_order: weeks.indexOf(data.week) + 1,
      month: data.month,
      month_order: months.indexOf(data.month) + 1,
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

  if (!plan) {
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
      ministry: session.user.ministry?.name.toUpperCase(),
      employee_id: session.user.employee_id.toUpperCase(),
      department: session.user.department?.name.toUpperCase(),
      role: session.user.role?.toUpperCase(),
      moth: plan.month.toUpperCase(),
      week: plan.week.toUpperCase(),
      startDate: plan?.task
        .map((task, index) => {
          if (index === 0) {
            return task.date;
          }
        })
        .join(""),
      endDate: plan?.task
        .map((task, index) => {
          if (index === 4) {
            return task.date;
          }
        })
        .join(""),

      plans: plan.task,
    },
    { status: 200 },
  );
};
