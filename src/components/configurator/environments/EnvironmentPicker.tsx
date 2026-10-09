import { useState } from "react";
import { ChevronDown, House, Sparkles, X } from "lucide-react";
import {
  ROOM_OPTIONS,
  labelForEnvironment,
  type EnvironmentChoice,
  type RoomKind,
  type RoomStyle,
} from "./types";

const descriptions: Record<RoomStyle, string> = {
  moderno: "Luz natural · madeira clara",
  contemporaneo: "Madeira e pedra · tons quentes",
  minimalista: "Linhas leves · tons suaves",
  premium: "Pedra, metais e luz cênica",
};
const tones: Record<RoomStyle, string> = {
  moderno: "from-[#e2d5bc] via-[#c4a37b] to-[#7e8c7c]",
  contemporaneo: "from-[#d5ccc0] via-[#9e826c] to-[#565e54]",
  minimalista: "from-[#f1eee5] via-[#d4cdc1] to-[#a4aaa3]",
  premium: "from-[#bcb09f] via-[#826b55] to-[#322d2a]",
};

export default function EnvironmentPicker({
  value,
  onChange,
}: {
  value: EnvironmentChoice;
  onChange: (choice: EnvironmentChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const room = ROOM_OPTIONS.find((option) => option.id === value.room)!;
  const chooseRoom = (next: RoomKind) => {
    const option = ROOM_OPTIONS.find((item) => item.id === next)!;
    onChange({ room: next, style: option.styles[0]!.id });
  };
  return (
    <div className="pointer-events-auto absolute left-4 top-[4.5rem] z-20 w-[min(21rem,calc(100vw-2rem))]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="environment-options"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-[#f8f5ee]/95 p-2.5 pr-4 text-left shadow-[0_16px_40px_-18px_rgba(41,32,23,.45)] backdrop-blur-xl transition hover:bg-white"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#392d25] text-[#eee4d2]">
          <House className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[.19em] text-[#897a69]">
            Ambiente
          </span>
          <span className="block truncate text-sm font-semibold text-[#352c26]">
            {labelForEnvironment(value)}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#74685b] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id="environment-options"
          className="mt-2 overflow-hidden rounded-2xl border border-[#e6ded2] bg-[#fbf9f4]/98 p-4 shadow-[0_28px_65px_-25px_rgba(34,27,20,.48)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.21em] text-[#907e68]">
                Showroom virtual
              </p>
              <p className="mt-1 font-display text-lg text-[#30271f]">Escolha seu ambiente</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-[#716558] hover:bg-[#ece5d9]"
              aria-label="Fechar ambientes"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Cômodo">
            {ROOM_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={value.room === option.id}
                onClick={() => chooseRoom(option.id)}
                className={`rounded-lg border px-1 py-2 text-xs font-semibold transition ${value.room === option.id ? "border-[#5b4635] bg-[#5b4635] text-white" : "border-[#e2dbd1] bg-white text-[#62564a] hover:border-[#9c8973]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#8e7e6c]">
            {room.label} · Estilo
          </p>
          <div className="space-y-2" role="group" aria-label={`Estilos de ${room.label}`}>
            {room.styles.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={value.style === option.id}
                onClick={() => {
                  onChange({ room: value.room, style: option.id });
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${value.style === option.id ? "border-[#86674a] bg-[#f3ebdf]" : "border-[#e9e3d9] bg-white hover:border-[#aa947b]"}`}
              >
                <span
                  className={`size-10 shrink-0 rounded-lg bg-gradient-to-br ${tones[option.id]} shadow-inner`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#352b23]">{option.label}</span>
                  <span className="block text-[10px] text-[#8a7d70]">
                    {descriptions[option.id]}
                  </span>
                </span>
                {value.style === option.id && <Sparkles className="size-4 text-[#9c7852]" />}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-[#8c8175]">
            O móvel e as suas configurações permanecem no centro da cena.
          </p>
        </div>
      )}
    </div>
  );
}
