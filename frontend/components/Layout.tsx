import AppShell from "@/components/AppShell";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <AppShell>{children}</AppShell>;
}
