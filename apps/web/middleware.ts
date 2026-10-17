import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/test/:path*",
    "/dashboard/:path*",
    "/plan/:path*",
    "/exercise/:path*",
    "/progress/:path*",
    "/calendar/:path*",
  ],
};
