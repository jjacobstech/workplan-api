import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { z, flattenError } from "zod";

const taskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().min(1),
  tools: z.string().min(1).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  time: z.string().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  constraints: z.string().min(1).optional(),
  date: z.string(),
});

const planSchema = z.object({
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
  task: z.array(taskSchema).min(1),
});

const weeklyPlanSchema = z.object({
  month: z.enum([
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
  ]),
  week: z.enum(
    ["WEEK_1", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5"],
    "Invalid Week: Only ['WEEK_1', 'WEEK_2', 'WEEK_3', 'WEEK_4', 'WEEK_5'] are allowed",
  ),
  // dateRange: z.string(),
  plans: z.array(planSchema).length(5, "Must have exactly 5 tasks"),
});

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const week = ["WEEK_1", "WEEK_2", "WEEK_3", "WEEK_4", "WEEK_5"];

const month = [
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
];

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
  const input = weeklyPlanSchema.safeParse(body);

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

  const exists = await prisma.plan.findFirst({
    where: {
      user_id: session.user.id,
      month: data.month,
      week: data.week,
    },
  });

  if (exists) {
    return NextResponse.json(
      {
        success: false,
        message: "Plan for this month and week already exists",
      },
      { status: 409 },
    );
  }

  const transaction = await prisma.$transaction(async (trx) => {
    const plan = await trx.plan.create({
      data: {
        user_id: session.user.id,
        month: data.month,
        month_order: month.indexOf(data.month) + 1,
        week: data.week,
        week_order: week.indexOf(data.week) + 1,
      },
    });
    const plans = data.plans;
    const task = [];

    // Create tasks for each day in the weekly plan
    for (const dayTask of plans) {
      for (const item of dayTask.task) {
        task.push(
          trx.task.create({
            data: {
              plan_id: plan.id,
              day: dayTask.day,
              day_order: days.indexOf(dayTask.day) + 1,
              title: item.title,
              notes: item.notes,
              tools: item.tools,
              priority: item.priority,
              time: item.time,
              status: item.status,
              constraints: item.constraints ?? "None",
              date: item.date,
            },
          }),
        );
      }
    }

    const tasks = await Promise.all(task);

    return { plan, tasks };
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        plan: transaction.plan,
        tasks: transaction.tasks,
      },
      message: "Plan created successfully",
    },
    { status: 200 },
  );
};
