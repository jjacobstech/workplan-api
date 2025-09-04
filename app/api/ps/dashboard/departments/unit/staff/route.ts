import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, flattenError } from "zod";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";

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

const inputSchema = z.object({
  unit_id: z.union([z.string(), z.number()]),
  department_id: z.union([z.string(), z.number()]),
  staff_id: z.union([z.string(), z.number()]),
  week: z
    .enum(weeks, `Invalid Week: Only ${weeks} are allowed`)
    .default(weeks[0]),
  month: z
    .enum(months, `Invalid Month specified: Only ${months} are allowed`)
    .default(months[new Date().getMonth()]),
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

  const staff_id = +input.data.staff_id;
  const unit_id = +input.data.unit_id;
  const department_id = +input.data.department_id;

  const user = await prisma.user.findFirst({
    where: {
      id: staff_id,
      department_id: department_id,
      unit_id: unit_id,
      OR: [
        {
          staff: true,
        },
        {
          head_of_unit: true,
        },
        {
          head_of_department: true,
        },
      ],
    },
    select: {
      id: true,
      employee_id: true,
      ministry_id: true,
      department_id: true,
      unit_id: true,
      role: true,
      avatar: true,
      head_of_department: true,
      head_of_service: true,
      head_of_unit: true,
      permanent_secretary: true,
      staff: true,
      plans: {
        where: {
          ...(input.data.week && { week: input.data.week }),
          ...(input.data.month && { month: input.data.month }),
        },
        include: {
          task: {
            orderBy: {
              day_order: "asc",
            },
          },
        },
      },
    },
  });

  if (!user)
    return NextResponse.json(
      {
        success: false,
        message: "User not found",
      },
      { status: 404 },
    );

  return NextResponse.json(
    {
      success: true,
      data: user,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 },
  );
};
