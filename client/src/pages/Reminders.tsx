import { useState } from "react";
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/use-reminders";
import { useClients } from "@/hooks/use-clients";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertReminderSchema } from "@shared/schema";
import { format, isPast, isToday, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2, Plus, Bell, Clock, Trash2, CheckCircle2, AlertCircle, Leaf, Waves, ThermometerSun, Wrench, Phone, Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { useLocation } from "wouter";
import { DataTable, ColumnDef, SortDir } from "@/components/ui/data-table";

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const typeIcons: Record<string, typeof Leaf> = {
  Garden: Leaf,
  Pool: Waves,
  Jacuzzi: ThermometerSun,
  General: Wrench,
};

const typeLabels: Record<string, string> = {
  Garden: "Jardim",
  Pool: "Piscina",
  Jacuzzi: "Jacuzzi",
  General: "Geral",
};

function getNextDueDate(frequency: string, fromDate: Date = new Date()): Date {
  switch (frequency) {
    case "weekly": return addWeeks(fromDate, 1);
    case "biweekly": return addWeeks(fromDate, 2);
    case "monthly": return addMonths(fromDate, 1);
    case "quarterly": return addMonths(fromDate, 3);
    case "yearly": return addYears(fromDate, 1);
    default: return addMonths(fromDate, 1);
  }
}

export default function Reminders() {
  const [activeTab, setActiveTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("nextDue");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data: reminders, isLoading } = useReminders();
  const { data: clients } = useClients();
  const deleteReminder = useDeleteReminder();
  const updateReminder = useUpdateReminder();
  const [, navigate] = useLocation();

  const overdueReminders = reminders?.filter(r => r.isActive && isPast(new Date(r.nextDue)) && !isToday(new Date(r.nextDue))) || [];
  const todayReminders = reminders?.filter(r => r.isActive && isToday(new Date(r.nextDue))) || [];
  const upcomingReminders = reminders?.filter(r => r.isActive && !isPast(new Date(r.nextDue)) && !isToday(new Date(r.nextDue))) || [];

  // Filter reminders for DataTable
  const filteredReminders = reminders?.filter(reminder => {
    const matchesTab = activeTab === "todos" || 
      (activeTab === "ativos" && reminder.isActive) || 
      (activeTab === "inativos" && !reminder.isActive);
    const matchesSearch = !search.trim() || 
      reminder.client?.name.toLowerCase().includes(search.toLowerCase()) ||
      reminder.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  }) || [];

  const sortedReminders = [...filteredReminders].sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortKey === "nextDue") {
      aVal = new Date(a.nextDue).getTime();
      bVal = new Date(b.nextDue).getTime();
    } else if (sortKey === "client") {
      aVal = a.client?.name || "";
      bVal = b.client?.name || "";
    } else {
      return 0;
    }
    if (sortDir === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const paginatedReminders = sortedReminders.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1); // Reset to first page on sort
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const columns: ColumnDef<any>[] = [
    {
      key: "client",
      header: "Cliente",
      sortable: true,
      cell: (reminder) => reminder.client?.name || "Cliente não encontrado",
      mobileLabel: "Cliente",
      className: "font-medium md:font-normal",
    },
    {
      key: "title",
      header: "Descrição",
      sortable: false,
      cell: (reminder) => reminder.title,
      mobileLabel: "Descrição",
    },
    {
      key: "frequency",
      header: "Frequência",
      sortable: false,
      cell: (reminder) => frequencyLabels[reminder.frequency] || reminder.frequency,
      mobileLabel: "Frequência",
      className: "text-muted-foreground text-sm md:text-foreground md:text-sm",
    },
    {
      key: "nextDue",
      header: "Próximo Aviso",
      sortable: true,
      cell: (reminder) => format(new Date(reminder.nextDue), "dd/MM/yyyy", { locale: pt }),
      mobileLabel: "Próximo Aviso",
      className: "text-muted-foreground text-sm md:text-foreground md:text-sm",
    },
    {
      key: "isActive",
      header: "Ativo",
      sortable: false,
      cell: (reminder) => (
        <Badge variant={reminder.isActive ? "default" : "secondary"}>
          {reminder.isActive ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      sortable: false,
      isAction: true,
      cell: (reminder) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleComplete(reminder)}
            disabled={!reminder.isActive}
          >
            <CheckCircle2 className="w-4 h-4" />
            Feito
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteReminder.mutate(reminder.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const onDemandClients = clients?.filter(c => 
    c.gardenVisitFrequency === "on_demand" || 
    c.poolVisitFrequency === "on_demand" || 
    c.jacuzziVisitFrequency === "on_demand"
  ) || [];

  const getOnDemandServices = (client: typeof clients extends (infer T)[] | undefined ? T : never) => {
    const services: { type: string; icon: typeof Leaf; color: string }[] = [];
    if (client.hasGarden && client.gardenVisitFrequency === "on_demand") {
      services.push({ type: "Jardim", icon: Leaf, color: "text-green-600" });
    }
    if (client.hasPool && client.poolVisitFrequency === "on_demand") {
      services.push({ type: "Piscina", icon: Waves, color: "text-blue-600" });
    }
    if (client.hasJacuzzi && client.jacuzziVisitFrequency === "on_demand") {
      services.push({ type: "Jacuzzi", icon: ThermometerSun, color: "text-muted-foreground" });
    }
    return services;
  };

  const handleComplete = async (reminder: typeof reminders extends (infer T)[] | undefined ? T : never) => {
    const nextDue = getNextDueDate(reminder.frequency, new Date());
    await updateReminder.mutateAsync({ id: reminder.id, data: { nextDue } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="pt-8 px-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton />
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Lembretes</h1>
              <p className="text-sm text-muted-foreground">Manutenções periódicas</p>
            </div>
          </div>
          <AddReminderDialog />
        </div>
      </div>

      <div className="px-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {onDemandClients.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-purple-600 uppercase tracking-wider">Verificar Mensalmente</h2>
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">{onDemandClients.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Clientes sem acordo fixo - verificar se precisam de serviço</p>
                <div className="space-y-2">
                  {onDemandClients.map((client) => {
                    const services = getOnDemandServices(client);
                    return (
                      <div 
                        key={client.id}
                        className="bg-purple-50/50 border border-purple-200/50 rounded-xl p-3 cursor-pointer hover-elevate"
                        onClick={() => navigate(`/clients/${client.id}`)}
                        data-testid={`on-demand-client-${client.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{client.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {services.map((service, idx) => {
                                  const ServiceIcon = service.icon;
                                  return (
                                    <span key={idx} className={`flex items-center gap-1 text-xs ${service.color}`}>
                                      <ServiceIcon className="w-3 h-3" />
                                      {service.type}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                            Quando necessário
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Lembretes de Manutenção</h2>
                <AddReminderDialog />
              </div>

              <div className="relative mb-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  inputMode="search"
                  placeholder="Procurar por cliente ou descrição…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-10"
                  aria-label="Pesquisar lembretes"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Limpar pesquisa"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                <button
                  onClick={() => setActiveTab("todos")}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeTab === "todos"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveTab("ativos")}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeTab === "ativos"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setActiveTab("inativos")}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeTab === "inativos"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  Inativos
                </button>
              </div>

              {paginatedReminders.length === 0 ? (
                <div className="bg-card rounded-2xl p-8 text-center border border-border/50">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium">Sem lembretes</p>
                  <p className="text-sm text-muted-foreground mt-1">Adicione lembretes para manutenções periódicas</p>
                </div>
              ) : (
                <DataTable
                  data={paginatedReminders}
                  columns={columns}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  page={page}
                  pageSize={pageSize}
                  totalCount={sortedReminders.length}
                  onPageChange={handlePageChange}
                />
              )}
            </section>

            {/* Keep the old sections for backward compatibility if needed */}
            {false && overdueReminders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider">Em Atraso</h2>
                </div>
                <div className="space-y-3">
                  {overdueReminders.map((reminder) => (
                    <ReminderCard 
                      key={reminder.id} 
                      reminder={reminder} 
                      variant="overdue"
                      onComplete={() => handleComplete(reminder)}
                      onDelete={() => deleteReminder.mutate(reminder.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {false && todayReminders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Hoje</h2>
                </div>
                <div className="space-y-3">
                  {todayReminders.map((reminder) => (
                    <ReminderCard 
                      key={reminder.id} 
                      reminder={reminder} 
                      variant="today"
                      onComplete={() => handleComplete(reminder)}
                      onDelete={() => deleteReminder.mutate(reminder.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {false && upcomingReminders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Próximos</h2>
                </div>
                <div className="space-y-3">
                  {upcomingReminders.map((reminder) => (
                    <ReminderCard 
                      key={reminder.id} 
                      reminder={reminder} 
                      variant="upcoming"
                      onComplete={() => handleComplete(reminder)}
                      onDelete={() => deleteReminder.mutate(reminder.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function ReminderCard({ 
  reminder, 
  variant, 
  onComplete, 
  onDelete 
}: { 
  reminder: any; 
  variant: "overdue" | "today" | "upcoming";
  onComplete: () => void;
  onDelete: () => void;
}) {
  const TypeIcon = typeIcons[reminder.type] || Wrench;
  
  return (
    <div 
      className={cn(
        "bg-card border rounded-xl p-4 shadow-sm",
        variant === "overdue" && "border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30",
        variant === "today" && "border-primary/20 bg-primary/5",
        variant === "upcoming" && "border-border"
      )}
      data-testid={`reminder-card-${reminder.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          reminder.type === "Garden" && "bg-green-100 text-green-700",
          reminder.type === "Pool" && "bg-blue-100 text-blue-700",
          reminder.type === "Jacuzzi" && "bg-muted text-muted-foreground",
          reminder.type === "General" && "bg-gray-100 text-gray-700"
        )}>
          <TypeIcon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground">{reminder.title}</h3>
              <p className="text-sm text-muted-foreground">{reminder.client?.name}</p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {frequencyLabels[reminder.frequency]}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className={cn(
              "text-xs",
              variant === "overdue" && "text-red-600 font-medium",
              variant === "today" && "text-primary font-medium",
              variant === "upcoming" && "text-muted-foreground"
            )}>
              {format(new Date(reminder.nextDue), "d 'de' MMMM", { locale: pt })}
            </p>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                onClick={onDelete}
                data-testid={`delete-reminder-${reminder.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 gap-1"
                onClick={onComplete}
                data-testid={`complete-reminder-${reminder.id}`}
              >
                <CheckCircle2 className="w-3 h-3" /> Feito
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddReminderDialog() {
  const [open, setOpen] = useState(false);
  const { data: clients } = useClients();
  const createReminder = useCreateReminder();

  const formSchema = insertReminderSchema.extend({
    clientId: z.number().min(1, "Selecione um cliente"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "Garden",
      frequency: "monthly",
      clientId: 0,
      nextDue: new Date(),
      isActive: true,
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createReminder.mutateAsync(values);
      setOpen(false);
      form.reset();
    } catch (e) {}
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1" data-testid="button-add-reminder">
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lembrete</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Limpeza mensal da piscina" className="rounded-xl" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Serviço</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Garden">Jardim</SelectItem>
                      <SelectItem value="Pool">Piscina</SelectItem>
                      <SelectItem value="Jacuzzi">Jacuzzi</SelectItem>
                      <SelectItem value="General">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequência</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextDue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima Data</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="rounded-xl"
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full btn-primary" disabled={createReminder.isPending}>
              {createReminder.isPending ? "A criar..." : "Criar Lembrete"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
