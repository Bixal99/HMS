"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { staggerCards } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type KanbanColumnDef = {
  id: string;
  label: string;
};

export type KanbanCardModel = {
  id: string;
  columnId: string;
};

type KanbanBoardProps<T extends KanbanCardModel> = {
  columns: KanbanColumnDef[];
  items: T[];
  onMove: (itemId: string, toColumnId: string) => void;
  renderCard: (item: T, helpers: { open: () => void }) => ReactNode;
  renderOverlay?: (item: T) => ReactNode;
  onCardOpen?: (item: T) => void;
  className?: string;
  emptyColumnText?: string;
};

function SortableCardShell({
  id,
  columnId,
  children,
}: {
  id: string;
  columnId: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { columnId } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex gap-1 rounded-lg border border-border bg-card shadow-sm transition-shadow",
        isDragging && "opacity-40 shadow-none",
      )}
      data-kanban-card
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab items-start px-1.5 py-3 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag card"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1 p-3 pl-0">{children}</div>
    </div>
  );
}

function Column({
  column,
  items,
  renderCard,
  onCardOpen,
  emptyColumnText,
}: {
  column: KanbanColumnDef;
  items: KanbanCardModel[];
  renderCard: (item: KanbanCardModel, helpers: { open: () => void }) => ReactNode;
  onCardOpen?: (item: KanbanCardModel) => void;
  emptyColumnText: string;
}) {
  const ids = items.map((i) => i.id);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[28rem] flex-col rounded-xl border border-border bg-muted/25 transition-shadow",
        isOver && "ring-2 ring-primary/50 bg-primary/5 shadow-md",
      )}
      data-column={column.id}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">{column.label}</h2>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-background px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border">
          {items.length}
        </span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy} id={column.id}>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {items.length === 0 ? (
            <div
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 px-3 py-8 text-center text-xs text-muted-foreground",
                isOver && "border-primary/50 bg-primary/5 text-primary",
              )}
            >
              {emptyColumnText}
            </div>
          ) : (
            items.map((item) => (
              <SortableCardShell key={item.id} id={item.id} columnId={item.columnId}>
                {renderCard(item, {
                  open: () => onCardOpen?.(item),
                })}
              </SortableCardShell>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function gridClassForColumns(count: number) {
  if (count <= 2) return "md:grid-cols-2";
  if (count === 3) return "md:grid-cols-3";
  return "md:grid-cols-2 xl:grid-cols-4";
}

export function KanbanBoard<T extends KanbanCardModel>({
  columns,
  items,
  onMove,
  renderCard,
  renderOverlay,
  onCardOpen,
  className,
  emptyColumnText = "Drop cards here",
}: KanbanBoardProps<T>) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!boardRef.current) return;
    const cards = boardRef.current.querySelectorAll("[data-kanban-card]");
    if (cards.length) staggerCards(cards);
  }, [items.length, columns.map((c) => c.id).join("|")]);

  const byColumn = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const col of columns) map.set(col.id, []);
    for (const item of items) {
      map.get(item.columnId)?.push(item);
    }
    return map;
  }, [columns, items]);

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  function findColumnOf(id: string): string | null {
    const item = items.find((i) => i.id === id);
    if (item) return item.columnId;
    if (columns.some((c) => c.id === id)) return id;
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const from = findColumnOf(String(active.id));
    let to: string | null = null;
    if (columns.some((c) => c.id === over.id)) {
      to = String(over.id);
    } else {
      to = findColumnOf(String(over.id));
    }

    if (!from || !to || from === to) return;
    onMove(String(active.id), to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        ref={boardRef}
        className={cn(
          "grid gap-3",
          gridClassForColumns(columns.length),
          className,
        )}
      >
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            items={(byColumn.get(column.id) ?? []) as KanbanCardModel[]}
            emptyColumnText={emptyColumnText}
            renderCard={(item, helpers) =>
              renderCard(item as T, {
                open: () => {
                  helpers.open();
                  onCardOpen?.(item as T);
                },
              })
            }
            onCardOpen={(item) => onCardOpen?.(item as T)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem
          ? (renderOverlay?.(activeItem) ?? (
              <div className="w-72 rotate-1 rounded-lg border border-primary/40 bg-card p-3 shadow-xl">
                Moving…
              </div>
            ))
          : null}
      </DragOverlay>
    </DndContext>
  );
}
