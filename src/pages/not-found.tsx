import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">404 — Page not found</h1>
          <p className="text-sm text-muted-foreground">
            That page doesn't exist. Let's get you back home.
          </p>
          <Link href="/">
            <Button className="mt-2">
              <Home className="h-4 w-4 mr-2" />
              Back to app
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
