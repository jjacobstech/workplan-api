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

  const session = await getAdminSession("ps", req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const ps = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      employee_id: session.user.employee_id,
      permanent_secretary: true,
    },
  });

  if (!ps) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
      { status: 401 }
    );
  }

  const transaction = await prisma.$transaction(async (trx) => {
    const staffNo = await trx.user.count({
      where: {
        ministry_id: ps.ministry_id,
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
    });

    const approvedPlans = await trx.plan.count({
      where: {
        approved: true,
        user: {
          ministry_id: ps.ministry_id,
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
      },
    });

    const pendingPlans = await trx.plan.count({
      where: {
        approved: false,
        user: {
          ministry_id: ps.ministry_id,
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
      },
    });

    const activeStaff = await trx.user.count({
      where: {
        ministry_id: ps.ministry_id,
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
        session: {
          some: {
            last_activity: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    const inActiveStaff = staffNo - activeStaff;

      const departments = await trx.department.findMany({
        where: {
          ...(ps.ministry_id && { ministry_id: ps.ministry_id }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          ministry: {
            select: {
              name: true,
            },
          },
        },
      });

    const units = await trx.unit.findMany({
      where: {
        ...(ps.ministry_id && { ministry_id: ps.ministry_id }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return {
      staffNo,
      approvedPlans,
      pendingPlans,
      activeStaff,
      inActiveStaff,
      departments,
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
      departments: transaction.departments,
      units: transaction.units,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 }
  );
};
