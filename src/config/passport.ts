import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma";
import { env } from "./env";

// Only register the Google strategy if credentials are actually configured.
// This lets the whole server boot normally even when Google OAuth hasn't
// been set up yet (e.g. missing env vars on a fresh deploy) — only the
// /api/auth/google routes are affected, not the entire API.
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },

      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Google account email not found"));
          }

          const name =
            profile.displayName || profile.name?.givenName || "Google User";

          let user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            // Brand new user signing up via Google
            user = await prisma.user.create({
              data: {
                name,
                email,
                password: null,
                googleId: profile.id,
                role: "CUSTOMER",
                status: "ACTIVE",
              },
            });
          } else if (!user.googleId) {
            // Existing email/password account logging in with Google for
            // the first time — link the accounts instead of duplicating.
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
          }

          if (user.status === "SUSPENDED") {
            return done(new Error("Your account has been suspended"));
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
} else {
  console.warn(
    "⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google Sign-In is disabled, rest of the API is unaffected."
  );
}

export default passport;