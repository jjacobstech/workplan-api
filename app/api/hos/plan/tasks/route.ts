import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { z, flattenError } from "zod";

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
const status = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

const weeklyPlanSchema = z.object({
  week: z
    .enum(weeks, `Invalid Week: Only ${weeks} are allowed`)
    .default(weeks[0]),
  month: z
    .enum(months, "Invalid Month specified")
    .default(months[new Date().getMonth()]),
  statusFilter: z.enum(status).optional(),
  priorityFilter: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

const updateSchema = z.object({
  task_id: z.union([z.string(), z.number()]),
  plan_id: z.union([z.string(), z.number()]),
  status: z.enum(status),
  completed: z.enum(["YES", "NO"]).optional(),
  reason: z.string().optional(),
});

export const PATCH = async (req: NextRequest) => {
  if (req.method !== "PATCH") {
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
  const input = updateSchema.safeParse(body);

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
  const plan_id = parseInt(`${data.plan_id}`);
  const task_id = parseInt(`${data.task_id}`);

  const task = await prisma.task.findUnique({
    where: {
      id: task_id,
      plan_id: plan_id,
    },
    include: {
      plan: true,
    },
  });

  if (!task) {
    return NextResponse.json(
      {
        success: false,
        message: "Task for this plan doesn't exists",
      },
      { status: 404 },
    );
  }

  const update = await prisma.task.update({
    where: {
      id: task_id,
      plan_id: plan_id,
    },
    data: {
      status: data.status,
      completed: data.completed,
      reason: data.reason,
    },
  });

  if (!update) {
    return NextResponse.json(
      {
        success: false,
        message: "error updating task record",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        task: update,
      },
      message: "Plan created successfully",
    },
    { status: 200 },
  );
};

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

  let body = {};

  try {
    body = await req.json();
  } catch (error) {
    console.error("JSON parsing error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          message: "Request body contains malformed JSON",
          details: error.message,
        },
        { status: 400 },
      );
    }
  }

  const input = weeklyPlanSchema.safeParse(body);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        message: flattenError(input.error).fieldErrors,
        data: body,
      },
      { status: 400 },
    );
  }

  const data = input.data;

  const plan = await prisma.plan.findFirst({
    where: {
      month: data.month,
      week: data.week,
      user_id: session.user.id,
    },
    include: {
      task: {
        where: {
          ...(data.priorityFilter && { priority: data.priorityFilter }),
          ...(data.statusFilter && { status: data.statusFilter }),
        },
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
      success: true,
      plan: plan,
      message: "Plan loaded successfully",
    },
    { status: 200 },
  );
};
