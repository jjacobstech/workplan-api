import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, flattenError } from "zod";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";

const inputSchema = z.object({
  unit_id: z.union([z.string(), z.number()]),
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
  const department_id = parseInt(`${session.user.department_id}`);

  const unit = await prisma.unit.findFirst({
    where: {
      id: unit_id,
      department_id: department_id,
    },
  });

  if (!unit) {
    return NextResponse.json(
      { success: false, message: "Unit does not exist in your department" },
      { status: 404 }
    );
  }

  const data = await prisma.user.findMany({
    where: {
      department_id: department_id,
      unit_id: unit.id,
      ...(input.data.role_filter && { role: input.data.role_filter }),
      ...(input.data.status_filter && {
        plans: {
        some: {
          approved:  input.data.status_filter === "approved"
              ? true
              : false,
        },
      }
      } )
    },
    select: {
      id: true,
      employee_id: true,
      ministry_id: true,
      department_id: true,
      unit_id: true,
      unit:true,
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
      data: data,
      roles: staffRoles,
      message: "Dashboard data retrieved successfully",
    },
    { status: 200 }
  );
};
