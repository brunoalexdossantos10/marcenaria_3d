export type RoomKind = "sala" | "cozinha" | "quarto" | "banheiro";
export type RoomStyle = "moderno" | "contemporaneo" | "premium" | "minimalista";

export type EnvironmentChoice = { room: RoomKind; style: RoomStyle };
export type RoomProps = {
  style: RoomStyle;
  width: number;
  depth: number;
  height: number;
};

export const ROOM_OPTIONS: {
  id: RoomKind;
  label: string;
  styles: { id: RoomStyle; label: string }[];
}[] = [
  {
    id: "sala",
    label: "Sala",
    styles: [
      { id: "moderno", label: "Moderna" },
      { id: "contemporaneo", label: "Contemporânea" },
      { id: "premium", label: "Premium" },
    ],
  },
  {
    id: "cozinha",
    label: "Cozinha",
    styles: [
      { id: "moderno", label: "Moderna" },
      { id: "minimalista", label: "Minimalista" },
      { id: "premium", label: "Premium" },
    ],
  },
  {
    id: "quarto",
    label: "Quarto",
    styles: [
      { id: "moderno", label: "Moderno" },
      { id: "minimalista", label: "Minimalista" },
      { id: "premium", label: "Suíte premium" },
    ],
  },
  {
    id: "banheiro",
    label: "Banheiro",
    styles: [
      { id: "moderno", label: "Moderno" },
      { id: "minimalista", label: "Minimalista" },
      { id: "premium", label: "Premium" },
    ],
  },
];

export const labelForEnvironment = (choice: EnvironmentChoice) => {
  const room = ROOM_OPTIONS.find((option) => option.id === choice.room)!;
  return `${room.label} ${room.styles.find((style) => style.id === choice.style)?.label.toLowerCase() ?? ""}`;
};
