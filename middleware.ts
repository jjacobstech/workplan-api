import { NextResponse, NextRequest } from "next/server";

export const middleware = async (req: NextRequest) => {
  const { method, headers, url } = req;

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: headers,
    });
  }

  // 2️⃣ Check for request body on non-GET/DELETE/OPTIONS methods
  const contentLength = headers.get("content-length");
  if (!["GET", "DELETE", "OPTIONS"].includes(method)) {
    if (!contentLength || contentLength === "0") {
      return NextResponse.json(
        { error: `${method} request must have a non-empty body` },
        { status: 400 },
      );
    }
  }

  if (!["GET", "DELETE", "OPTIONS"].includes(method)) {
    if ((await req.json()) === null) {
      return NextResponse.json(
        { error: `${method} request must have a non-empty body` },
        { status: 400 },
      );
    }
  }

  // 3️⃣ Authentication checks
  const authorization = headers.get("authorization");
  const cookie = headers.get("cookie");

  if (authorization) {
    if (authorization.startsWith("Bearer ")) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Invalid Authorization Header" },
      { status: 401 },
    );
  }

  if (cookie) {
    const sessionCookie = req.cookies.get("session_token")?.value;
    if (sessionCookie) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Invalid Session Cookie" },
      { status: 401 },
    );
  }

  // 4️⃣ Redirect HTML requests to login
  const contentType = headers.get("content-type");
  if (
    contentType === "text/html" ||
    headers.get("accept")?.includes("text/html")
  ) {
    NextResponse.redirect(new URL("/login", url));
  }

  // 5️⃣ Default response for unauthorized requests
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
};

export const config = {
  matcher: [
    "/api/hos/dashboard/:path*",
    "/hos/dashboard/:path*",
    "/api/ps/dashboard/:path*",
    "/ps/dashboard/:path*",
    "/api/hod/dashboard/:path*",
    "/hod/dashboard/:path*",
    "/api/hou/dashboard/:path*",
    "/hou/dashboard/:path*",
    "/api/staff/:path*",
    "/staff/:path*",
  ],
};
