import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClientSchema } from "@shared/schema";
import { useCreateClient } from "@/hooks/use-clients";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPicker } from "@/components/MapPicker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Loader2, Plus, Leaf, Waves, ThermometerSun, Euro, Clock,
  Banknote, Building2, Smartphone, CalendarDays, ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DurationInput } from "@/components/DurationInput";
import { cn } from "@/lib/utils";

const formSchema = insertClientSchema.extend({
  name: z
    .string({ required_error: "O nome é obrigatório" })
    .trim()
    .min(2, "O nome tem de ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().min(3, "O telefone é demasiado curto").optional().or(z.literal("")),
  monthlyRate: z
    .number({ invalid_type_error: "Indique um valor numérico" })
    .positive("O valor tem de ser superior a 0")
    .optional(),
  hourlyRate: z
    .number({ invalid_type_error: "Indique um valor numérico" })
    .positive("O valor tem de ser superior a 0")
    .optional(),
  perVisitRate: z
    .number({ invalid_type_error: "Indique um valor numérico" })
    .positive("O valor tem de ser superior a 0")
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STEP_LABELS = ["Básico", "Serviços", "Faturação", "Técnico", "Localização"];

const STEP_FIELDS: (keyof FormValues)[][] = [
  ["name", "phone", "email", "address"],
  ["hasGarden", "hasPool", "hasJacuzzi", "gardenVisitFrequency", "poolVisitFrequency", "jacuzziVisitFrequency", "serviceDurationMinutes"],
  ["billingType", "monthlyRate", "hourlyRate", "perVisitRate", "paymentMethod", "scheduledTransferDay"],
  ["poolLength", "poolWidth", "poolMinDepth", "poolMaxDepth", "jacuzziLength", "jacuzziWidth", "jacuzziDepth"],
  ["latitude", "longitude", "notes"],
];

export function CreateClientWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const createClient = useCreateClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      hasGarden: false,
      hasPool: false,
      hasJacuzzi: false,
      gardenVisitFrequency: "seasonal",
      poolVisitFrequency: "seasonal",
      jacuzziVisitFrequency: "seasonal",
      latitude: undefined,
      longitude: undefined,
      billingType: "monthly",
      monthlyRate: undefined,
      hourlyRate: undefined,
      perVisitRate: undefined,
      paymentMethod: undefined,
      scheduledTransferDay: undefined,
      poolLength: undefined,
      poolWidth: undefined,
      poolMinDepth: undefined,
      poolMaxDepth: undefined,
      jacuzziLength: undefined,
      jacuzziWidth: undefined,
      jacuzziDepth: undefined,
      serviceDurationMinutes: 60,
    },
  });

  const billingType = form.watch("billingType");
  const hasGarden = form.watch("hasGarden");
  const hasPool = form.watch("hasPool");
  const hasJacuzzi = form.watch("hasJacuzzi");
  const hasTechnical = hasPool || hasJacuzzi;

  const totalSteps = hasTechnical ? 5 : 4;
  const visibleStepLabels = hasTechnical ? STEP_LABELS : STEP_LABELS.filter((_, i) => i !== 3);

  function getActualStep(displayStep: number): number {
    if (!hasTechnical && displayStep >= 3) return displayStep + 1;
    return displayStep;
  }

  async function handleNext() {
    const actualStep = getActualStep(step);
    const fields = STEP_FIELDS[actualStep];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      form.reset();
      setStep(0);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      await createClient.mutateAsync(values as any);
      handleOpenChange(false);
    } catch {
      // Error handled by hook
    }
  }

  const actualStep = getActualStep(step);
  const isLast = step === totalSteps - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="rounded-full w-12 h-12 p-0 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="button-create-client"
          aria-label="Adicionar novo cliente"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Adicionar Novo Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            {visibleStepLabels.map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary/20 text-primary border-2 border-primary" :
                  "bg-muted text-muted-foreground"
                )}>
                  {i < step ? <Check className="w-3 h-3" aria-hidden="true" /> : i + 1}
                </div>
                {i < visibleStepLabels.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-1 transition-colors", i < step ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Passo {step + 1} de {totalSteps} — <span className="font-semibold text-foreground">{visibleStepLabels[step]}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* STEP 1 — Básico */}
            {actualStep === 0 && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input data-testid="input-client-name" placeholder="Nome do cliente" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input data-testid="input-client-phone" placeholder="Telefone" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input data-testid="input-client-email" placeholder="Email" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Morada</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-client-address"
                          placeholder="Rua das Flores, 123..."
                          {...field}
                          value={field.value ?? ""}
                          className="rounded-xl min-h-[60px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* STEP 2 — Serviços */}
            {actualStep === 1 && (
              <>
                <div className="space-y-3">
                  <FormLabel>Serviços Necessários</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="hasGarden"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 shadow-sm bg-background/50">
                          <div className="flex items-center space-x-2">
                            <Leaf className="w-4 h-4 text-green-600" aria-label="Jardim" role="img" />
                            <span className="text-xs font-medium">Jardim</span>
                          </div>
                          <FormControl>
                            <Checkbox data-testid="checkbox-has-garden" checked={field.value ?? false} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasPool"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 shadow-sm bg-background/50">
                          <div className="flex items-center space-x-2">
                            <Waves className="w-4 h-4 text-blue-500" aria-label="Piscina" role="img" />
                            <span className="text-xs font-medium">Piscina</span>
                          </div>
                          <FormControl>
                            <Checkbox data-testid="checkbox-has-pool" checked={field.value ?? false} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasJacuzzi"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 shadow-sm bg-background/50">
                          <div className="flex items-center space-x-2">
                            <ThermometerSun className="w-4 h-4 text-muted-foreground" aria-label="Jacuzzi" role="img" />
                            <span className="text-xs font-medium">Jacuzzi</span>
                          </div>
                          <FormControl>
                            <Checkbox data-testid="checkbox-has-jacuzzi" checked={field.value ?? false} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {hasGarden && (
                  <div className="space-y-3 p-3 rounded-xl border bg-green-50/50">
                    <FormLabel className="flex items-center gap-2 text-green-700">
                      <Leaf className="w-4 h-4" aria-hidden="true" />
                      Frequência de Visitas (Jardim)
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name="gardenVisitFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value || "seasonal"} className="grid grid-cols-1 gap-2">
                              {[
                                { value: "seasonal", label: "Sazonal (padrão)", desc: "Época alta: 2x/mês | Época baixa: 1x/mês" },
                                { value: "once_monthly", label: "Acordo Especial", desc: "1 visita por mês durante todo o ano" },
                                { value: "on_demand", label: "Quando Necessário", desc: "Sem acordo fixo - serviço a pedido" },
                              ].map((opt) => (
                                <div key={opt.value} className={cn("flex items-start space-x-3 rounded-xl border p-3 shadow-sm cursor-pointer transition-colors", field.value === opt.value ? "border-green-500 bg-green-100/50" : "bg-background/50")}>
                                  <RadioGroupItem value={opt.value} id={`garden_${opt.value}`} className="mt-0.5" />
                                  <Label htmlFor={`garden_${opt.value}`} className="flex flex-col cursor-pointer">
                                    <span className="text-sm font-medium">{opt.label}</span>
                                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {hasPool && (
                  <div className="space-y-2 p-3 rounded-xl border bg-blue-50/50">
                    <FormLabel className="flex items-center gap-2 text-blue-700">
                      <Waves className="w-4 h-4" aria-hidden="true" />
                      Frequência de Visitas (Piscina)
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name="poolVisitFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value || "seasonal"} className="grid grid-cols-1 gap-2">
                              {[
                                { value: "seasonal", label: "Sazonal (padrão)", desc: "Época alta: 1x/semana | Época baixa: 2x/mês" },
                                { value: "once_monthly", label: "Acordo Especial", desc: "1 visita por mês durante todo o ano" },
                                { value: "on_demand", label: "Quando Necessário", desc: "Sem acordo fixo - serviço a pedido" },
                              ].map((opt) => (
                                <div key={opt.value} className={cn("flex items-start space-x-3 rounded-xl border p-3 shadow-sm cursor-pointer transition-colors", field.value === opt.value ? "border-blue-500 bg-blue-100/50" : "bg-background/50")}>
                                  <RadioGroupItem value={opt.value} id={`pool_${opt.value}`} className="mt-0.5" />
                                  <Label htmlFor={`pool_${opt.value}`} className="flex flex-col cursor-pointer">
                                    <span className="text-sm font-medium">{opt.label}</span>
                                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {hasJacuzzi && (
                  <div className="space-y-2 p-3 rounded-xl border bg-muted/30">
                    <FormLabel className="flex items-center gap-2 text-muted-foreground">
                      <ThermometerSun className="w-4 h-4" aria-hidden="true" />
                      Frequência de Visitas (Jacuzzi)
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name="jacuzziVisitFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value || "seasonal"} className="grid grid-cols-1 gap-2">
                              {[
                                { value: "seasonal", label: "Sazonal (padrão)", desc: "Época alta: 1x/semana | Época baixa: 2x/mês" },
                                { value: "once_monthly", label: "Acordo Especial", desc: "1 visita por mês durante todo o ano" },
                                { value: "on_demand", label: "Quando Necessário", desc: "Sem acordo fixo - serviço a pedido" },
                              ].map((opt) => (
                                <div key={opt.value} className={cn("flex items-start space-x-3 rounded-xl border p-3 shadow-sm cursor-pointer transition-colors", field.value === opt.value ? "border-primary bg-primary/10" : "bg-background/50")}>
                                  <RadioGroupItem value={opt.value} id={`jacuzzi_${opt.value}`} className="mt-0.5" />
                                  <Label htmlFor={`jacuzzi_${opt.value}`} className="flex flex-col cursor-pointer">
                                    <span className="text-sm font-medium">{opt.label}</span>
                                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="space-y-2 p-3 rounded-xl border bg-muted/30">
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                    Duração Estimada do Serviço
                  </FormLabel>
                  <FormField
                    control={form.control}
                    name="serviceDurationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DurationInput value={field.value ?? 60} onChange={field.onChange} data-testid="input-service-duration" />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Tempo médio para realizar todos os serviços neste cliente</p>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* STEP 3 — Faturação */}
            {actualStep === 2 && (
              <>
                <div className="space-y-3">
                  <FormLabel>Tipo de Faturação</FormLabel>
                  <FormField
                    control={form.control}
                    name="billingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value || "monthly"} className="grid grid-cols-3 gap-3">
                            <div className={cn("flex items-center space-x-2 rounded-xl border p-3 shadow-sm cursor-pointer transition-colors", field.value === 'monthly' ? "border-primary bg-primary/5" : "bg-background/50")}>
                              <RadioGroupItem value="monthly" id="monthly" />
                              <Label htmlFor="monthly" className="flex items-center gap-2 cursor-pointer">
                                <Euro className="w-4 h-4 text-primary" aria-hidden="true" />
                                <span className="text-sm font-medium">Mensal</span>
                              </Label>
                            </div>
                            <div className={cn("flex items-center space-x-2 rounded-xl border p-3 shadow-sm cursor-pointer transition-colors", field.value === 'hourly' ? "border-primary bg-primary/5" : "bg-background/50")}>
                              <RadioGroupItem value="hourly" id="hourly" />
                              <Label htmlFor="hourly" className="flex items-center gap-2 cursor-pointer">
                                <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
                                <span className="text-sm font-medium">À Hora</span>
                              </Label>
                            </div>
                            <div className={cn("flex items-center space-x-2 rounded-xl border p-3 shadow-sm cursor-pointer transition-colors", field.value === 'per_visit' ? "border-primary bg-primary/5" : "bg-background/50")}>
                              <RadioGroupItem value="per_visit" id="per_visit" />
                              <Label htmlFor="per_visit" className="flex items-center gap-2 cursor-pointer">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                                <span className="text-sm font-medium">Por Visita</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {billingType === "monthly" && (
                    <FormField
                      control={form.control}
                      name="monthlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Mensal (€)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl" data-testid="input-monthly-rate" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {billingType === "hourly" && (
                    <FormField
                      control={form.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor por Hora (€)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl" data-testid="input-hourly-rate" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {billingType === "per_visit" && (
                    <FormField
                      control={form.control}
                      name="perVisitRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor por Visita (€)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl" data-testid="input-per-visit-rate" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-3 p-3 rounded-xl border bg-muted/30">
                  <FormLabel className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-primary" aria-hidden="true" />
                    Método de Pagamento
                  </FormLabel>
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl" data-testid="select-payment-method">
                              <SelectValue placeholder="Selecione o método" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">
                              <div className="flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-primary" aria-hidden="true" />
                                Dinheiro
                              </div>
                            </SelectItem>
                            <SelectItem value="bank_transfer">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" aria-hidden="true" />
                                Transferência Bancária
                              </div>
                            </SelectItem>
                            <SelectItem value="mbway">
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-destructive" aria-hidden="true" />
                                MBway
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {form.watch("paymentMethod") === "bank_transfer" && (
                    <FormField
                      control={form.control}
                      name="scheduledTransferDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm">
                            <CalendarDays className="w-4 h-4" aria-hidden="true" />
                            Dia da Transferência Agendada
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Dia</span>
                              <Input type="number" min="1" max="31" placeholder="15" className="rounded-xl w-20" data-testid="input-scheduled-transfer-day" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                              <span className="text-sm text-muted-foreground">de cada mês</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Opcional — indica quando o cliente costuma fazer a transferência</p>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </>
            )}

            {/* STEP 4 — Detalhes Técnicos (piscina / jacuzzi) */}
            {actualStep === 3 && (
              <>
                {hasPool && (
                  <div className="space-y-3 p-3 rounded-xl border bg-blue-50/50">
                    <FormLabel className="flex items-center gap-2 text-blue-700">
                      <Waves className="w-4 h-4" aria-hidden="true" />
                      Dimensões da Piscina (metros)
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { name: "poolLength" as const, label: "Comprimento", placeholder: "10.0", testId: "input-pool-length" },
                        { name: "poolWidth" as const, label: "Largura", placeholder: "5.0", testId: "input-pool-width" },
                        { name: "poolMinDepth" as const, label: "Prof. Mínima", placeholder: "1.0", testId: "input-pool-min-depth" },
                        { name: "poolMaxDepth" as const, label: "Prof. Máxima", placeholder: "2.0", testId: "input-pool-max-depth" },
                      ]).map((f) => (
                        <FormField key={f.name} control={form.control} name={f.name} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{f.label}</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder={f.placeholder} className="rounded-xl" data-testid={f.testId} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    {form.watch("poolLength") && form.watch("poolWidth") && form.watch("poolMinDepth") && form.watch("poolMaxDepth") && (
                      <p className="text-sm text-blue-700 font-medium">
                        Volume: {((form.watch("poolLength") || 0) * (form.watch("poolWidth") || 0) * ((form.watch("poolMinDepth") || 0) + (form.watch("poolMaxDepth") || 0)) / 2).toFixed(1)} m³
                      </p>
                    )}
                  </div>
                )}

                {hasJacuzzi && (
                  <div className="space-y-3 p-3 rounded-xl border bg-muted/30">
                    <FormLabel className="flex items-center gap-2 text-muted-foreground">
                      <ThermometerSun className="w-4 h-4" aria-hidden="true" />
                      Dimensões do Jacuzzi (metros)
                    </FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { name: "jacuzziLength" as const, label: "Comprimento", placeholder: "2.0", testId: "input-jacuzzi-length" },
                        { name: "jacuzziWidth" as const, label: "Largura", placeholder: "2.0", testId: "input-jacuzzi-width" },
                        { name: "jacuzziDepth" as const, label: "Profundidade", placeholder: "0.8", testId: "input-jacuzzi-depth" },
                      ]).map((f) => (
                        <FormField key={f.name} control={form.control} name={f.name} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{f.label}</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder={f.placeholder} className="rounded-xl" data-testid={f.testId} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    {form.watch("jacuzziLength") && form.watch("jacuzziWidth") && form.watch("jacuzziDepth") && (
                      <p className="text-sm text-muted-foreground font-medium">
                        Volume: {((form.watch("jacuzziLength") || 0) * (form.watch("jacuzziWidth") || 0) * (form.watch("jacuzziDepth") || 0)).toFixed(1)} m³
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* STEP 5 — Localização + Resumo */}
            {actualStep === 4 && (
              <>
                <div className="space-y-2">
                  <FormLabel>Localização no Mapa</FormLabel>
                  <MapPicker
                    latitude={form.watch("latitude")}
                    longitude={form.watch("longitude")}
                    onChange={(lat, lng) => {
                      form.setValue("latitude", lat);
                      form.setValue("longitude", lng);
                    }}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Iniciais</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-client-notes" placeholder="Código do portão, animais, etc." {...field} value={field.value ?? ""} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resumo</p>
                  <p className="text-sm"><span className="font-medium">Nome:</span> {form.watch("name") || "—"}</p>
                  {form.watch("phone") && <p className="text-sm"><span className="font-medium">Telefone:</span> {form.watch("phone")}</p>}
                  {form.watch("email") && <p className="text-sm"><span className="font-medium">Email:</span> {form.watch("email")}</p>}
                  <p className="text-sm">
                    <span className="font-medium">Serviços:</span>{" "}
                    {[hasGarden && "Jardim", hasPool && "Piscina", hasJacuzzi && "Jacuzzi"].filter(Boolean).join(", ") || "Nenhum"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Faturação:</span>{" "}
                    {{ monthly: "Mensal", hourly: "À Hora", per_visit: "Por Visita" }[billingType ?? ""] || billingType}
                  </p>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 rounded-xl"
                  data-testid="button-wizard-back"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" />
                  Anterior
                </Button>
              )}
              {!isLast ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 btn-primary"
                  data-testid="button-wizard-next"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createClient.isPending}
                  data-testid="button-wizard-submit"
                >
                  {createClient.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                      Criar Cliente
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
