import { Link, useLocation, Outlet } from "react-router-dom";
import { Grid3X3, Binary, Layers, List, Library } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { path: "/", label: "纹样解析", icon: <Grid3X3 size={20} /> },
  { path: "/coding", label: "挑压编码", icon: <Binary size={20} /> },
  { path: "/steps", label: "分步图谱", icon: <Layers size={20} /> },
  { path: "/materials", label: "备料清单", icon: <List size={20} /> },
  { path: "/templates", label: "模板库", icon: <Library size={20} /> },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bambooCream-50">
      <aside className="flex w-60 flex-col border-r border-bamboo-200 bg-bambooCream-100/60 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-2 border-b border-bamboo-200 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bambooGreen-500 text-white">
            <Grid3X3 size={20} />
          </div>
          <span className="font-kai text-lg font-bold text-bambooBrown-800">竹编图谱</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "nav-item",
                  isActive && "nav-item-active"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-bamboo-200 p-4">
          <div className="font-kai text-xs text-bambooBrown-500">
            竹编挑压编织图谱系统
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-bamboo-200 bg-bambooCream-50/80 px-8 backdrop-blur-sm">
          <h1 className="font-song text-xl font-semibold text-bambooBrown-800">
            {menuItems.find((item) => {
              if (item.path === "/") return location.pathname === "/";
              return location.pathname.startsWith(item.path);
            })?.label || "竹编图谱系统"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="font-song text-sm text-bambooBrown-600">欢迎使用</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
