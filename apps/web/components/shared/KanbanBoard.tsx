"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  MeasuringStrategy,
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
import { GripVertical } from "lucide-react";
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

type OverlayPos = { x: number; y: number; width: number };

function SortableCardShell({
  id,
  columnId,
  children,
  dragging,
}: {
  id: string;
  columnId: string;
  children: ReactNode;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useSortable({
    id,
    data: { columnId },
    // Prevent layout animations from leaving a stuck translate after drop.
    animateLayoutChanges: () => false,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex touch-none gap-1 rounded-lg border border-border bg-card shadow-sm",
        dragging && "opacity-30",
      )}
      data-kanban-card
      // Never leave a stale dnd transform on the source card.
      style={{ transform: "none" }}
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
  activeId,
  renderCard,
  onCardOpen,
  emptyColumnText,
}: {
  column: KanbanColumnDef;
  items: KanbanCardModel[];
  activeId: string | null;
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
              <SortableCardShell
                key={item.id}
                id={item.id}
                columnId={item.columnId}
                dragging={activeId === item.id}
              >
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

/**
 * Pointer-tracked floating card — uses clientX/clientY directly so the ghost
 * cannot drift from scroll containers, GSAP, or dnd-kit transform math.
 */
function FreeDragGhost({
  pos,
  children,
}: {
  pos: OverlayPos;
  children: ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] [&>*]:w-full"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.width,
      }}
    >
      {children}
    </div>,
    document.body,
  );
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlayPos, setOverlayPos] = useState<OverlayPos | null>(null);
  const grabOffset = useRef({ x: 0, y: 0 });
  const cardWidth = useRef(280);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const col of columns) map.set(col.id, []);
    for (const item of items) {
      map.get(item.columnId)?.push(item);
    }
    return map;
  }, [columns, items]);

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  // Keep ghost glued to the live pointer for the whole drag.
  useEffect(() => {
    if (!activeId) return;

    const onPointerMove = (e: PointerEvent) => {
      setOverlayPos({
        x: e.clientX - grabOffset.current.x,
        y: e.clientY - grabOffset.current.y,
        width: cardWidth.current,
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [activeId]);

  function findColumnOf(id: string): string | null {
    const item = items.find((i) => i.id === id);
    if (item) return item.columnId;
    if (columns.some((c) => c.id === id)) return id;
    return null;
  }

  function clearDrag() {
    setActiveId(null);
    setOverlayPos(null);
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);

    const ev = event.activatorEvent;
    const initial = event.active.rect.current.initial;
    if (!ev || !("clientX" in ev) || !initial) return;

    const pointer = ev as PointerEvent;
    grabOffset.current = {
      x: pointer.clientX - initial.left,
      y: pointer.clientY - initial.top,
    };
    cardWidth.current = initial.width || 280;
    setOverlayPos({
      x: pointer.clientX - grabOffset.current.x,
      y: pointer.clientY - grabOffset.current.y,
      width: cardWidth.current,
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    clearDrag();
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
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={clearDrag}
    >
      <div
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
            activeId={activeId}
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

      {activeItem && overlayPos
        ? (
          <FreeDragGhost pos={overlayPos}>
            {renderOverlay?.(activeItem) ?? (
              <div className="rounded-lg border border-primary/50 bg-card p-3 shadow-2xl ring-2 ring-primary/25">
                <p className="text-sm font-medium">Moving…</p>
              </div>
            )}
          </FreeDragGhost>
        )
        : null}
    </DndContext>
  );
}
