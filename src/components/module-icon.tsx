import {
  FileText,
  FileUp,
  Gauge,
  KeyRound,
  LayoutGrid,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { AppModuleId } from "@/lib/module-theme";

type ModuleIconProps = {
  className?: string;
  moduleId: AppModuleId;
  strokeWidth?: number;
};

export function ModuleIcon({
  className = "h-4 w-4",
  moduleId,
  strokeWidth = 1.9,
}: ModuleIconProps) {
  switch (moduleId) {
    case "dashboard":
      return <LayoutGrid className={className} strokeWidth={strokeWidth} />;
    case "support":
      return <Gauge className={className} strokeWidth={strokeWidth} />;
    case "referent":
      return <UserRound className={className} strokeWidth={strokeWidth} />;
    case "brief":
      return <FileText className={className} strokeWidth={strokeWidth} />;
    case "import":
      return <FileUp className={className} strokeWidth={strokeWidth} />;
    case "admin":
      return <ShieldCheck className={className} strokeWidth={strokeWidth} />;
    case "access":
      return <KeyRound className={className} strokeWidth={strokeWidth} />;
  }
}
