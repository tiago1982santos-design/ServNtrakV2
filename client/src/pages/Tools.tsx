import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { 
  Ruler, StickyNote, Calculator, Timer, Flashlight, Compass, 
  Scale, ArrowRightLeft, ExternalLink, Smartphone
} from "lucide-react";

interface ToolItem {
  name: string;
  description: string;
  icon: typeof Ruler;
  iosUrl: string;
  androidUrl?: string;
  webUrl?: string;
  color: string;
  bgColor: string;
}

const tools: ToolItem[] = [
  {
    name: "Fita Métrica",
    description: "Medir distâncias e áreas",
    icon: Ruler,
    iosUrl: "measure://",
    androidUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.measureapp",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/30",
  },
  {
    name: "Notas",
    description: "Anotações rápidas",
    icon: StickyNote,
    iosUrl: "mobilenotes://",
    androidUrl: "https://play.google.com/store/apps/details?id=com.google.android.keep",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-950/30",
  },
  {
    name: "Calculadora",
    description: "Cálculos rápidos",
    icon: Calculator,
    iosUrl: "calc://",
    webUrl: "https://www.calculator.net/",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
  {
    name: "Cronómetro",
    description: "Medir tempo de trabalho",
    icon: Timer,
    iosUrl: "clock-stopwatch://",
    webUrl: "https://www.online-stopwatch.com/",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-950/30",
  },
  {
    name: "Lanterna",
    description: "Iluminação extra",
    icon: Flashlight,
    iosUrl: "shortcuts://run-shortcut?name=Flashlight",
    webUrl: "https://flashlight.free-online.co/",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/30",
  },
  {
    name: "Nível",
    description: "Verificar superfícies",
    icon: Compass,
    iosUrl: "measure://",
    webUrl: "https://www.levelpro.online/",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/30",
  },
  {
    name: "Conversor de Unidades",
    description: "Converter medidas",
    icon: ArrowRightLeft,
    iosUrl: "https://www.unitconverters.net/",
    webUrl: "https://www.unitconverters.net/",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950/30",
  },
  {
    name: "Balança Digital",
    description: "Estimar pesos",
    icon: Scale,
    iosUrl: "https://play.google.com/store/apps/details?id=com.rcalc.kitchenscalewithweight",
    webUrl: "https://www.calculator.net/weight-converter.html",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-950/30",
  },
];

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

function handleToolClick(tool: ToolItem) {
  let url = tool.webUrl || tool.iosUrl;
  
  if (isIOS()) {
    url = tool.iosUrl;
  } else if (isAndroid() && tool.androidUrl) {
    url = tool.androidUrl;
  }
  
  if (url.startsWith("http")) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
}

export default function Tools() {
  const platform = isIOS() ? "ios" : isAndroid() ? "android" : "web";
  
  return (
    <div className="min-h-screen bg-background pb-24 page-transition">
      <div className="gradient-primary pt-10 pb-6 px-5 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative z-10 flex items-center gap-3">
          <BackButton />
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Ruler className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white" data-testid="heading-tools">
              Ferramentas
            </h1>
            <p className="text-white/70 text-sm" data-testid="text-tools-subtitle">
              Atalhos para apps úteis
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Smartphone className="w-4 h-4" />
          <span>
            {platform === "ios" && "Dispositivo iOS detectado"}
            {platform === "android" && "Dispositivo Android detectado"}
            {platform === "web" && "Versão web - algumas funcionalidades podem estar limitadas"}
          </span>
        </div>
        
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => handleToolClick(tool)}
            className="w-full mobile-card flex items-center gap-4 text-left"
            data-testid={`button-tool-${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className={`w-12 h-12 rounded-2xl ${tool.bgColor} flex items-center justify-center shrink-0`}>
              <tool.icon className={`w-5 h-5 ${tool.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">{tool.name}</h3>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground/50" />
          </button>
        ))}
        
        <div className="mt-6 p-4 bg-muted/30 rounded-xl text-sm text-muted-foreground">
          <p className="font-medium mb-2">Nota:</p>
          <p>
            Algumas apps podem não abrir diretamente dependendo do seu dispositivo. 
            {platform === "ios" && " No iOS, as apps nativas como Medida e Notas abrem diretamente."}
            {platform === "android" && " No Android, pode ser necessário instalar algumas apps da Play Store."}
            {platform === "web" && " No browser, serão abertas versões web das ferramentas."}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
