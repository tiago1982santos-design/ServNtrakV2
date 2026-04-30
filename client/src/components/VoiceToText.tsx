import React from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send } from "lucide-react";

interface VoiceToTextProps {
  onFinalText: (text: string) => void;
}

export default function VoiceToText({ onFinalText }: VoiceToTextProps) {
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <p className="text-destructive">O seu browser não suporta comandos de voz.</p>;
  }

  const handleSendToAI = () => {
    onFinalText(transcript);
    resetTranscript();
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-background shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Relatório de Voz</h3>
        <Button
          type="button"
          variant={listening ? "destructive" : "default"}
          onClick={() => {
            if (listening) SpeechRecognition.stopListening();
            else SpeechRecognition.startListening({ language: 'pt-PT', continuous: true });
          }}
        >
          {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
          {listening ? "Parar" : "Ouvir"}
        </Button>
      </div>

      <Textarea
        value={transcript}
        readOnly
        placeholder="O que ditar aparecerá aqui..."
        className="bg-muted min-h-[100px]"
      />

      <Button
        type="button"
        disabled={!transcript || listening}
        onClick={handleSendToAI}
        className="w-full"
      >
        <Send className="mr-2 h-4 w-4" /> Enviar para Assistente IA
      </Button>
    </div>
  );
}
