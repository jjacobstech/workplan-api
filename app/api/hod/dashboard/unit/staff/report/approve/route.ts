import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, flattenError } from "zod";
import { getAdminSession } from "@/lib/session";
import prisma from "@/lib/prisma";

const inputSchema = z.object({
  unit_id: z.union([z.string(), z.number()]),
  staff_id: z.union([z.string(), z.number()]),
  plan_id: z.union([z.string(), z.number()]),
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
  const plan_id = parseInt(`${input.data.plan_id}`);

  const exist = await prisma.plan.findFirst({
    where: {
      id: plan_id,
      user_id: staff_id,
      user: {
        unit_id: unit_id,
      },
    },
  });

  if (!exist)
    return NextResponse.json(
      {
        success: false,
        message: "plan not found",
      },
      { status: 404 }
    );

  if (exist && exist.approved)
    return NextResponse.json(
      {
        success: true,
        message: "Status was already approved — no changes made",
      },
      { status: 200 }
    );

  const plan = await prisma.plan.update({
    where: {
      id: plan_id,
      user_id: staff_id,
      user: {
        unit_id: unit_id,
      },
    },
    data: {
      approved: true,
    },
  });

  if (!plan)
    return NextResponse.json(
      {
        success: false,
        message: "An error occured",
      },
      { status: 404 }
    );

  return NextResponse.json(
    {
      success: true,
      data: {
        former: exist,
        updated: plan,
      },
    },
    { status: 200 }
  );
};
