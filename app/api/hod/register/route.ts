import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z, flattenError } from "zod";

const RegisterSchema = z
  .object({
    employee_id: z.string().min(2).max(100).trim(),
    ministry: z.string().min(2).max(100).trim().toLowerCase(),
    department: z.string().min(2).max(100).trim().toLowerCase(),
    role: z.string().min(2).max(100).trim().toLowerCase(),
    password: z.string().min(6).trim(),
    confirm_password: z.string().min(6).trim(),
  })

  .refine((form) => form.password === form.confirm_password, {
    message: "passwords do not match",
    path: ["confirm_password"],
  });

export const POST = async (req: NextRequest) => {
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed", success: false },
      { status: 405 },
    );
  }

  const body = await req.json();
  const form = RegisterSchema.safeParse(body);

  if (!form.success) {
    return NextResponse.json(
      {
        success: false,
        message: flattenError(form.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({
    where: {
      employee_id: form.data.employee_id,
    },
  });

  if (exists) {
    return NextResponse.json(
      {
        success: false,
        message: "User with this employee ID already exists",
      },
      { status: 404 },
    );
  }

  try {
    const transaction = await prisma.$transaction(async (trx) => {
      const ministry = await trx.ministry.upsert({
        where: { name: form.data.ministry },
        update: {},
        create: { name: form.data.ministry },
      });

     const department = await trx.department.upsert({
  where: {
    name_ministry_id: {       // Prisma auto-generates this composite name
      name: form.data.department,
      ministry_id: ministry.id
    }
  },
  update: {},
  create: {
    name: form.data.department,
    ministry_id: ministry.id
  },
});

      const rounds = 10;
      const hashed_password = await bcrypt.hash(form.data.password, rounds);

      const user = await trx.user.create({
        data: {
          employee_id: form.data.employee_id,
          ministry_id: ministry.id,
          department_id: department.id,
          role: form.data.role,
          password: hashed_password,
          head_of_department: true,
        },
      });

      return { user };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        admin_id: transaction.user.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error({ "Registration error": err });
    return NextResponse.json(
      {
        success: false,
        message: "An error has occurred",
      },
      { status: 500 },
    );
  }
};
