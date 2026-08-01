import {
  LayoutDashboard,
  Wheat,
  UserCheck,
  Zap,
  Cog,
  Package,
  Factory,
  Store,
  Boxes,
  Users,
  Truck,
  Wallet,
  FileText,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Role = "OWNER" | "MANAGER" | "ACCOUNTANT" | "OPERATOR";

export type NavItem = {
  key: string; // i18n key
  href: string;
  icon: LucideIcon;
  roles?: Role[]; // না থাকলে সবার জন্য
};

export type NavGroup = {
  titleKey: string; // i18n key
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    titleKey: "nav.group.overview",
    items: [
      { key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    titleKey: "nav.group.inputs",
    items: [
      { key: "nav.purchases", href: "/purchases", icon: Wheat },
      { key: "nav.workforce", href: "/workforce", icon: UserCheck },
      { key: "nav.utilities", href: "/utilities", icon: Zap },
      { key: "nav.machines", href: "/machines", icon: Cog },
    ],
  },
  {
    titleKey: "nav.group.state",
    items: [
      { key: "nav.inventory", href: "/inventory", icon: Package },
      { key: "nav.production", href: "/production", icon: Factory },
    ],
  },
  {
    titleKey: "nav.group.outputs",
    items: [
      { key: "nav.sales", href: "/sales", icon: Store },
      { key: "nav.byproducts", href: "/byproducts", icon: Boxes },
    ],
  },
  {
    titleKey: "nav.group.records",
    items: [
      { key: "nav.customers", href: "/customers", icon: Users },
      { key: "nav.suppliers", href: "/suppliers", icon: Truck },
      { key: "nav.reports", href: "/reports", icon: FileText },
      { key: "nav.verify", href: "/verify", icon: QrCode },
    ],
  },
  {
    titleKey: "nav.group.system",
    items: [
      {
        key: "nav.settings",
        href: "/settings",
        icon: Settings,
        roles: ["OWNER", "MANAGER"],
      },
    ],
  },
];
