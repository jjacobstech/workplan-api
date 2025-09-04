import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z, flattenError } from "zod";

const RegisterSchema = z
  .object({
    employee_id: z.string().min(2).max(100).trim(),
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
    const rounds = 10;
    const hashed_password = await bcrypt.hash(form.data.password, rounds);

    const user = await prisma.user.create({
      data: {
        employee_id: form.data.employee_id,
        role: "head of service",
        password: hashed_password,
        head_of_service: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        admin_id: user.id,
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
