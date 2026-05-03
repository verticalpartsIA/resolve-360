import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: () => <AppLayout />,
});
