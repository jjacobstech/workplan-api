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
      { status: 405 }
    );
  }

  const session = await getAdminSession("hod", req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
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
      { status: 400 }
    );
  }

  const unit_id = parseInt(`${input.data.unit_id}`);
  const staff_id = parseInt(`${input.data.staff_id}`);

  const user = await prisma.user.findFirst({
    where: {
      id: staff_id,
      department_id: session.user.department_id,
      unit_id: unit_id,
      OR: [
        {
          staff: true,
        },
        {
          head_of_unit: true,
        },
      ],
    },
    select: {
      id: true,
      employee_id: true,
      ministry_id: true,
      department_id: true,
      department: true,
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
        select: {
          id: true,
          month: true,
          week: true,
          task: {
            orderBy:{
              day_order: "asc"
            }
          },
          created_at:true
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
      { status: 404 }
    );

  const plan = user.plans[0]; // assume only one plan is relevant

  const startDate = plan?.task[0]?.date || "";
  const startDay = plan?.task[0]?.day || "";
  const endDate = plan?.task[plan.task.length - 1]?.date || "";
  const endDay = plan?.task[plan.task.length - 1]?.day || "";
  const month= plan?.created_at.getMonth() || 0;
  const year = plan?.created_at.getFullYear() || 0;

  const pendingTasks =  await prisma.task.count({
    where: {
      plan_id: plan.id,
      OR: [
        { completed: null },
        { completed: "NO" }
      ]
    }
  });
  
  const completedTasks =  await prisma.task.count({
    where: {
      plan_id: plan.id,
      completed: "YES"
    }
  })
  
  const totalTasks = await prisma.task.count({
    where: {
      plan_id: plan.id,
      OR: [
        { completed: null },
        { completed: "NO" },
        { completed: "YES" }
      ]
    }
  })


return NextResponse.json({
  success: true,
  data: {

     pendingTasks :pendingTasks,
 completedTasks: completedTasks,
totalTasks:totalTasks,
    user: {
      id: user.id,
      employee_id: user.employee_id,
      ministry_id: user.ministry_id,
      department_id: user.department_id,
      unit_id: user.unit_id,
      role: user.role,
      avatar: user.avatar,
      head_of_department: user.head_of_department,
      head_of_service: user.head_of_service,
      head_of_unit: user.head_of_unit,
      permanent_secretary: user.permanent_secretary,
      staff: user.staff,
    },
    plan: {
      plan_id: plan.id,
      month: months[month],
      year,
      tasks: plan?.task || [],
  },
  startDate: startDate.split("/")[0],
  endDate: endDate.split("/")[0],
  startDay: startDay,
  endDay: endDay,
}
},
{status:200});

};
