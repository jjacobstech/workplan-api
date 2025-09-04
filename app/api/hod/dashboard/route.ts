import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export const GET = async (req: NextRequest) => {
  if (req.method !== "GET") {
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

  const hod = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      employee_id: session.user.employee_id,
      head_of_department: true,
    },
  });

  if (!hod) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
      { status: 401 }
    );
  }

  const transaction = await prisma.$transaction(async (trx) => {
    const staffNo = await trx.user.count({
      where: {
        department_id: hod.department_id,
        ministry_id: hod.ministry_id,
        OR: [
          {
            staff: true,
          },

          {
            head_of_unit: true,
          },
        ],
      },
    });

    const approvedPlans = await trx.plan.count({
      where: {
        approved: true,
        user: {
          department_id: hod.department_id,
          ministry_id: hod.ministry_id,
          OR: [
            {
              staff: true,
            },

            {
              head_of_unit: true,
            },
          ],
        },
      },
    });

    const pendingPlans = await trx.plan.count({
      where: {
        approved: false,
        user: {
          department_id: hod.department_id,
          ministry_id: hod.ministry_id,
          OR: [
            {
              staff: true,
            },

            {
              head_of_unit: true,
            },
          ],
        },
      },
    });

    const activeStaff = await trx.user.count({
      where: {
        department_id: hod.department_id,
        ministry_id: hod.ministry_id,
        OR: [
          {
            staff: true,
          },

          {
            head_of_unit: true,
          },
        ],
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

    const units = await trx.unit.findMany({
      where: { ...(hod.department_id && { department_id: hod.department_id }) },
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });

    return {
      staffNo,
      approvedPlans,
      pendingPlans,
      activeStaff,
      inActiveStaff,
      units,
    };
  });

  return NextResponse.json(
    {
      success: true,
      user: session.user,
      analytics: {
        staffNo: transaction.staffNo,
        approvedPlans: transaction.approvedPlans,
        pendingPlans: transaction.pendingPlans,
        activeStaff: transaction.activeStaff,
        inActiveStaff: transaction.inActiveStaff,
      },
      units: transaction.units,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 }
  );
};
