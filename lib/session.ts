import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
import crypto from "crypto";

export const createSession = async (user_id: number, req: NextRequest) => {
  const cryptToken = crypto.randomBytes(32).toString("hex");
  const sessionToken = await bcrypt.hash(cryptToken, 10);

  const userSession = await prisma.session.create({
    data: {
      user_id: user_id,
      session_id: cryptToken,
      token: sessionToken,
      user_agent: req.headers.get("user-agent") || "unknown",
      ip_address: req.headers.get("x-forwarded-for") || "",
      last_activity: new Date(),
    },
  });

  return {
    token: `${userSession.session_id}`,
  };
};

export const destroySession = async (user_id: number, req: NextRequest) => {
  const token = parseAuthToken(req);
  if (!token) return false;

  const session = await prisma.session.findFirst({
    where: { user_id: user_id, session_id: token },
  });
  if (!session || session.user_id !== user_id) return false;

  const isValid = await bcrypt.compare(token, session.token);
  if (!isValid) return false;

  await prisma.session.delete({
    where: { session_id: token },
  });
  return { user: session.user_id, success: true };
};

export const getSession = async (req: NextRequest) => {
  const token = parseAuthToken(req);

  if (!token) return false;

  const userSession = await prisma.session.findFirst({
    where: {
      session_id: token,
       user: { staff: true },
    },
    include: {
      user: {
        select: {
          id: true,
          employee_id: true,
          department: true,
          ministry:true,
          unit:true,
          role:true,
          staff: true,
        },
      },
    },
  });

  if (!userSession || !userSession.user) return false;

  const sessionRenew = await prisma.session.update({
    where: {
      session_id: token,

    },
    data: {
      last_activity: new Date(),
    },
  });

  if (!sessionRenew) return false;

  if (!userSession.user.staff) return false;

  const isValid = await bcrypt.compare(token, userSession.token);

  if (!isValid) return false;

  return {
    authenticated: isValid,
    user: userSession?.user,
  };
};

//  ADMIN SESSION MANAGEMENT

export const destroyAdminSession = async (
  user_id: number,
  admintype: string,
  req: NextRequest,
) => {
  const token = parseAuthToken(req);
  if (!token) return false;

  let query: object = {};
  switch (admintype) {
    case "hos":
      query = {
        head_of_service: true,
      };
      break;

    case "ps":
      query = {
        permanent_secretary: true,
      };
      break;

    case "hod":
      query = {
        head_of_department: true,
      };
      break;

    default:
    case "hou":
      query = { head_of_unit: true };
      break;
  }

  const session = await prisma.session.findFirst({
    where: {
      session_id: token,
      user_id: user_id,
      user: query,
    },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!session) return false;

  const isValid = await bcrypt.compare(token, session.token);
  if (!isValid) return false;

  await prisma.session.delete({ where: { session_id: token } });
  return { user: session.user.id, success: true };
};

export const getAdminSession = async (admintype: string, req: NextRequest) => {
  const token = parseAuthToken(req);

  if (!token) return false;

  let query: object = {};

  // check admin type ad adapts query object to type
  switch (admintype) {
    case "hos":
      query = {
        head_of_service: true,
      };
      break;

    case "ps":
      query = {
        permanent_secretary: true,
      };
      break;

    case "hod":
      query = {
        head_of_department: true,
      };
      break;

    default:
    case "hou":
      query = { head_of_unit: true };
      break;
  }

  const userSession = await prisma.session.findFirst({
    where: {
      session_id: token,
      user: query,
    },
    include: {
      user: {
        select:{
          id:true,
          employee_id:true,
          ministry_id:true,
          ministry:{
            select:{
              name:true
            }
          },
          department_id:true,
          department:{
            select:{
              name:true
            }
          },
          unit_id:true,
          unit:{
            select:{
              id:true,
              name:true
            }
          },
          role:true,
          avatar:true
        }
      }
    },
  });

  if (!userSession || !userSession.user_id) return false;

  const sessionRenew = await prisma.session.update({
    where: {
      session_id: token,
      user: query,
    },
    data: {
      last_activity: new Date(),
    },
  });

  if (!sessionRenew) return false;

  const isValid = await bcrypt.compare(token, userSession.token);

  if (!isValid) return false;

  return {
    authenticated: isValid,
    user: userSession?.user,
  };
};

// TOKEN PROCESSING

function parseAuthToken(req: NextRequest) {
  // Try Bearer token from Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    return token;
  }

  // Try cookie
  const cookie = req.cookies.get("session_token")?.value;
  if (cookie) {
    return cookie;
  }
}
