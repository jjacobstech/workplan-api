import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z, flattenError } from "zod";

const RegisterSchema = z
  .object({
    employee_id: z.string().min(2).max(100).trim(),
    department: z.string().min(2).max(100).trim().toLowerCase(),
    ministry: z.string().min(2).max(100).trim().toLowerCase(),
    unit: z.string().min(2).max(100).trim().toLowerCase(),
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
      { status: 409 },
    );
  }

  try {
    const transaction = await prisma.$transaction(async (trx) => {
// Upsert ministry (name is globally unique)
const ministry = await trx.ministry.upsert({
  where: { name: form.data.ministry },
  update: {},
  create: { name: form.data.ministry },
});

// Upsert department (name unique only within ministry)
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

// Upsert unit (name unique only within department)
     const unit = await trx.unit.upsert({
        where: {
          name_department_id_ministry_id: {
            // Prisma auto-generates this composite name
            name: form.data.unit,
            ministry_id: ministry.id,
            department_id: department.id,
          },
        },
        update: {},
        create: {
          name: form.data.unit,
          ministry_id: ministry.id,
          department_id: department.id,
        },
      });

      const rounds = 10;
      const hashed_password = await bcrypt.hash(form.data.password, rounds);

      const user = await trx.user.create({
        data: {
          employee_id: form.data.employee_id,
          ministry_id: ministry.id,
          department_id: department.id,
          unit_id: unit.id,
          role: form.data.role,
          password: hashed_password,
          staff: true,
        },
      });

      return { user };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user_id: transaction.user.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error({ "Registration error": err });
    return NextResponse.json(
      {
        success: false,
        message: "An error has occurred",
        error: err
      },
      { status: 500 },
    );
  }
};
