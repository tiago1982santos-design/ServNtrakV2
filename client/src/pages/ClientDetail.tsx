import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useClient } from "@/hooks/use-clients";
import { useServiceLogs, useCreateServiceLog } from "@/hooks/use-service-logs";
import { useAppointments, useCreateAppointment } from "@/hooks/use-appointments";
import { useUpload } from "@/hooks/use-upload";
import { Loader2, ArrowLeft, Phone, MapPin, Leaf, Waves, ThermometerSun, Plus, Calendar, CheckCircle2, Camera, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertServiceLogSchema, insertAppointmentSchema } from "@shared/schema";
import { format } from "date-fns";

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = parseInt(id || "0");
  const { data: client, isLoading } = useClient(clientId);
  const { data: logs } = useServiceLogs(id);
  const { data: appointments } = useAppointments({ clientId: id });

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (!client) return <div>Cliente não encontrado</div>;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-primary text-primary-foreground pt-8 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10">
          <Link href="/clients" className="inline-flex items-center text-primary-foreground/80 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Link>
          
          <h1 className="text-3xl font-display font-bold">{client.name}</h1>
          
          <div className="flex flex-col gap-2 mt-4 text-primary-foreground/90">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm hover:underline">
                <Phone className="w-4 h-4" /> {client.phone}
              </a>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" /> {client.address}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Tags */}
      <div className="px-6 -mt-8 relative z-20">
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border/50 flex flex-wrap gap-3">
          {client.hasGarden && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <Leaf className="w-4 h-4" /> Jardim
            </div>
          )}
          {client.hasPool && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <Waves className="w-4 h-4" /> Piscina
            </div>
          )}
          {client.hasJacuzzi && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
              <ThermometerSun className="w-4 h-4" /> Jacuzzi
            </div>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="px-6 mt-6">
        <Tabs defaultValue="history">
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Histórico</TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Registos de Serviço</h3>
              <AddServiceLogDialog clientId={clientId} />
            </div>

            {logs?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Ainda sem histórico de serviço.</p>
            ) : (
              logs?.map((log) => (
                <div key={log.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                      {log.type === 'Garden' ? 'Jardim' : log.type === 'Pool' ? 'Piscina' : log.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.date), "d 'de' MMM, yyyy")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{log.description}</p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Agendamentos</h3>
              <AddAppointmentDialog clientId={clientId} />
            </div>
            
            {appointments?.filter(a => !a.isCompleted).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sem agendamentos futuros.</p>
            ) : (
              appointments?.filter(a => !a.isCompleted).map((apt) => (
                <div key={apt.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary shrink-0">
                    <span className="text-xs font-bold uppercase">{format(new Date(apt.date), "MMM")}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(apt.date), "d")}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">Serviço de {apt.type === 'Garden' ? 'Jardim' : apt.type === 'Pool' ? 'Piscina' : apt.type}</h4>
                    <p className="text-sm text-muted-foreground">{format(new Date(apt.date), "HH:mm")}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AddServiceLogDialog({ clientId }: { clientId: number }) {
  const [open, setOpen] = useState(false);
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const createLog = useCreateServiceLog();
  const { uploadFile, isUploading } = useUpload();
  
  const form = useForm<z.infer<typeof insertServiceLogSchema>>({
    resolver: zodResolver(insertServiceLogSchema),
    defaultValues: {
      clientId,
      type: "Garden",
      description: "",
      date: new Date(),
    }
  });

  const handlePhotoUpload = async (file: File, type: "before" | "after") => {
    const result = await uploadFile(file);
    if (result) {
      if (type === "before") {
        setPhotosBefore(prev => [...prev, result.objectPath]);
      } else {
        setPhotosAfter(prev => [...prev, result.objectPath]);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof insertServiceLogSchema>) => {
    try {
      await createLog.mutateAsync({
        ...values,
        photosBefore,
        photosAfter,
      });
      setOpen(false);
      form.reset();
      setPhotosBefore([]);
      setPhotosAfter([]);
    } catch (e) {}
  };

  const removePhoto = (type: "before" | "after", index: number) => {
    if (type === "before") {
      setPhotosBefore(prev => prev.filter((_, i) => i !== index));
    } else {
      setPhotosAfter(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 rounded-lg" data-testid="button-add-service-log">
          <Plus className="w-3 h-3" /> Registar Trabalho
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registar Serviço</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Serviço</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl" data-testid="select-service-type">
                        <SelectValue placeholder="Selecione o tipo" />
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="O que fez hoje?" 
                      className="rounded-xl" 
                      data-testid="input-service-description"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Fotos Antes</FormLabel>
              <div className="flex flex-wrap gap-2">
                {photosBefore.map((path, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    <button 
                      type="button" 
                      onClick={() => removePhoto("before", idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      data-testid={`button-remove-before-photo-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => beforeInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors disabled:opacity-50"
                  data-testid="button-upload-before-photo"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                </button>
                <input
                  ref={beforeInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], "before")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <FormLabel>Fotos Depois</FormLabel>
              <div className="flex flex-wrap gap-2">
                {photosAfter.map((path, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    <button 
                      type="button" 
                      onClick={() => removePhoto("after", idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      data-testid={`button-remove-after-photo-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => afterInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors disabled:opacity-50"
                  data-testid="button-upload-after-photo"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                </button>
                <input
                  ref={afterInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], "after")}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full btn-primary" disabled={createLog.isPending || isUploading}>
              {createLog.isPending ? "A guardar..." : "Guardar Registo"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddAppointmentDialog({ clientId }: { clientId: number }) {
  const [open, setOpen] = useState(false);
  const createApt = useCreateAppointment();
  
  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      clientId,
      type: "Garden",
      notes: "",
      date: new Date(),
    }
  });

  const onSubmit = async (values: z.infer<typeof insertAppointmentSchema>) => {
    try {
      await createApt.mutateAsync(values);
      setOpen(false);
      form.reset();
    } catch (e) {}
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 rounded-lg">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Serviço</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Hora</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      className="rounded-xl" 
                      // Simple workaround for datetime-local needing ISO string without seconds/Z
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                      // value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                    />
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
                        <SelectValue placeholder="Selecione o tipo" />
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Instruções especiais..." 
                      className="rounded-xl" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full btn-primary" disabled={createApt.isPending}>
              {createApt.isPending ? "A agendar..." : "Agendar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
