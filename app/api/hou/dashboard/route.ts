import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { z, flattenError } from "zod";

const inputSchema = z.object({
  role_filter: z.string().optional(),
  status_filter: z.string().optional(),
});

export const POST = async (req: NextRequest) => {
  if (req.method !== "POST") {
    return NextResponse.json(
      { success: false, message: "Method Not Allowed" },
      { status: 405 }
    );
  }

  const session = await getAdminSession("hou", req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const hou = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      employee_id: session.user.employee_id,
      head_of_unit: true,
    },
  });

  if (!hou) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
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

  const transaction = await prisma.$transaction(async (trx) => {
    const staffNo = await trx.user.count({
      where: {
        unit_id: hou.unit_id,
        department_id: hou.department_id,
        ministry_id: hou.ministry_id,
        staff: true,
      },
    });

    const approvedPlans = await trx.plan.count({
      where: {
        approved: true,
        user: {
          unit_id: hou.unit_id,
          department_id: hou.department_id,
          ministry_id: hou.ministry_id,
          staff: true,
        },
      },
    });

    const pendingPlans = await trx.plan.count({
      where: {
        approved: false,
        user: {
          unit_id: hou.unit_id,
          department_id: hou.department_id,
          ministry_id: hou.ministry_id,
          staff: true,
        },
      },
    });

    const activeStaff = await trx.user.count({
      where: {
        unit_id: hou.unit_id,
        department_id: hou.department_id,
        ministry_id: hou.ministry_id,
        staff: true,
        session: {
          some: {
            last_activity: {
              gte: new Date(Date.now() - 5 * 60 * 1000),
            },
          },
        },
      },
    });

    const inActiveStaff = staffNo - activeStaff;

    return {
      staffNo,
      approvedPlans,
      pendingPlans,
      activeStaff,
      inActiveStaff,
    };
  });

  const data = await prisma.user.findMany({
    where: {
      department_id: hou.department_id,
      unit_id: hou.unit_id,
      staff: true,
      ...(input.data.role_filter && { role: input.data.role_filter }),
      ...(input.data.status_filter && {
        plans: {
          some: {
            approved: input.data.status_filter === "approved" ? true : false,
          },
        },
      }),
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
        orderBy: [{ week_order: "asc" }, { month_order: "asc" }],
      },
    },
  });

  const staffRoles: (string | null)[] = [];
  data.forEach((dataset) => {
    console.log(dataset.role);
    staffRoles.push(dataset.role);
  });

  return NextResponse.json(
    {
      success: true,
      analytics: {
        staffNo: transaction.staffNo,
        approvedPlans: transaction.approvedPlans,
        pendingPlans: transaction.pendingPlans,
        activeStaff: transaction.activeStaff,
        inActiveStaff: transaction.inActiveStaff,
      },
      data: data,
      roles: staffRoles,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 }
  );
};
