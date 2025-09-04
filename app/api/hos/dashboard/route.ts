import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";


export const GET = async (req: NextRequest) => {
  if (req.method !== "GET") {
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
      head_of_service: true,
    },
  });

  if (!hos) {
    return NextResponse.json(
      { success: false, message: "Unauthorized or invalid Staff" },
      { status: 401 },
    );
  }

  const transaction = await prisma.$transaction(async (trx) => {
    const staffNo = await trx.user.count({
      where: {
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
          {
            permanent_secretary: true,
          },
        ],
      },
    });

    const approvedPlans = await trx.plan.count({
      where: {
        approved: true,
        user: {
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
            {
              permanent_secretary: true,
            },
          ],
        },
      },
    });

    const pendingPlans = await trx.plan.count({
      where: {
        approved: false,
        user: {
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
            {
              permanent_secretary: true,
            },
          ],
        },
      },
    });

    const activeStaff = await trx.user.count({
      where: {
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
          {
            permanent_secretary: true,
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

    const ministries = await trx.ministry.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    const departments = await trx.department.findMany({
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
      select: {
        id: true,
        name: true,
        description: true,
        department: {
          select: {
            name: true,
          },
        },
        ministry: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      staffNo,
      approvedPlans,
      pendingPlans,
      activeStaff,
      inActiveStaff,
      ministries,
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
      ministries: transaction.ministries,
      departments: transaction.departments,
      units: transaction.units,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 },
  );
};
