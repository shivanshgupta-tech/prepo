import Link from "next/link";
import { isClerkConfigured } from "@/lib/clerk-config";
import { isDatabaseConfigured } from "@/lib/db-config";
import { Button } from "@/components/ui/button";

const MainLayout = async ({ children }) => {
  if (!isClerkConfigured()) {
    return (
      <div className="container mx-auto mt-24 mb-20 max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold gradient-title">Sign-in is not set up yet</h1>
        <p className="text-muted-foreground">
          Add your Clerk keys to <code>.env.local</code>, then restart the
          server to use the dashboard, resume builder, and interview tools.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <div className="container mx-auto mt-24 mb-20 max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold gradient-title">Database is not set up yet</h1>
        <p className="text-muted-foreground">
          Add a Postgres <code>DATABASE_URL</code> to <code>.env.local</code>,
          then restart the server.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  return <div className="container mx-auto mt-24 mb-20">{children}</div>;
};

export default MainLayout;
