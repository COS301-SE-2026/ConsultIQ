import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import UnderutilisationCard from "../components/underutilisation-card";
import {
    ReasonCode,
    type Task,
    type SchedulerWeekResponse,
    type WeekContainer,
    type SetTaskStatusDto,
    type ToggleSubtaskDto,
    type SchedulerCommitResult,
    type Interval,
    type SplitTaskDto,
    type CalendarEntryDto,
    type Issue,
    type UnplacedTaskSummary
} from "../types/scheduler.types";
import { getProjectColour } from "../components/week/project-colour";
import { type BacklogProjectOption } from "../components/backlog-panel";
import TaskForm, { type TaskSubmission } from "../components/task-form";
import SchedulerAlertBanner from "../components/scheduler-alert-banner";
import SchedulerHeader from "../components/scheduler-header/scheduler-header";
import TaskBoard from "../components/task-board";
import SplitTaskDialog from "../components/split-task-dialog";
import {
    getSchedulerWeek, setSchedulerTaskStatus, toggleSchedulerSubtask, toCalendarWeek, createSchedulerTask,
    updateSchedulerTask, deleteSchedulerTask, splitSchedulerTask, placeUnplacedTasks, moveBlock, resizeBlock, pinBlock, moveSlot,
    deferTasksToNextWeek, acceptDeadlineMiss,
    createCalendarEntry, updateCalendarEntry, deleteCalendarEntry, dismissSchedulerIssue, getSchedulerSuggestions, type SchedulerSuggestion, pullForwardTasks
} from "../services/scheduler.service"
import { getAssignedProjects } from "../../consultants/services/consultant.service";
import { toast } from "sonner";
import { REASON_MESSAGE } from "../utils/scheduler.utils";
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";
import DeadlineResolutionDialog from "../components/deadline-resolution-dialog";
import { type AlertActionKind } from "../utils/reason-code-registry";

interface SchedulerTaskTabProps {
    readonly loading: boolean;
    readonly error: string | null;
    readonly week: WeekContainer | null;
    readonly progress: Record<string, { completed: number; total: number }>;
    readonly projects: BacklogProjectOption[];
    readonly onEdit: (task: Task) => void;
    readonly onSetStatus: (taskId: string, dto: SetTaskStatusDto,) => void | Promise<void>;
    readonly onToggleSubtask: (taskId: string, subtaskId: string, dto: ToggleSubtaskDto) => void | Promise<void>;
    readonly onSchedule: (taskId: string) => void | Promise<void>;
    readonly onDelete: (taskId: string) => void | Promise<void>;
    readonly onSplit: (task: Task) => void;
    readonly onDeferToNextWeek: (taskId: string) => void | Promise<void>;
    readonly onAcceptDeadlineMiss: (taskId: string) => void | Promise<void>;
}

const NOTIFICATION_CODES = new Set([
    "UNPLACED_TASKS",
    "DEADLINE_INFEASIBLE",
    "CONTAINER_OVERFLOW",
    "SOFT_CAP_BREACH",
    "DAY_SPAN_LIMIT_AT_RISK",
    "CONTAINERS_EXCEED_CONTRACT",
]);

type SchedulerTab = "calendar" | "tasks" | "notifications";

function getCurrentWeekStart(timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());

    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);

    const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);

    return date.toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, weeks: number): string {
    const date = new Date(`${weekStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + weeks * 7);
    return date.toISOString().slice(0, 10);
}

function SchedulerTaskTab({ loading, error, week, progress, projects, onEdit, onSetStatus, onToggleSubtask, onSchedule, onDelete, onSplit, onDeferToNextWeek, onAcceptDeadlineMiss }: SchedulerTaskTabProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => { setNow(Date.now()); }, 60_000);
        return () => window.clearInterval(timer);
    }, []);

    if (loading) { return <p className="p-4">Loading week...</p>; }

    if (error) { return <p role="alert" className="p-4 text-red-700">{error}</p>; }

    if (!week) { return null; }

    return (
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <TaskBoard
                tasks={week.tasks}
                projects={projects}
                now={now}
                expectedVersion={week.version}
                subtaskProgressByTaskId={progress}
                onEditTask={onEdit}
                onSetStatus={onSetStatus}
                onToggleSubtask={onToggleSubtask}
                onSchedule={onSchedule}
                onDeferToNextWeek={onDeferToNextWeek}
                onAcceptDeadlineMiss={onAcceptDeadlineMiss}
                onDelete={onDelete}
                onSplit={onSplit}
            />
        </div>
    );
}

export default function SchedulerPage() {
    const { count: unreadCount } = useUnreadNotificationCount();
    const [activeTab, setActiveTab] = useState<SchedulerTab>("calendar");

    const schedulerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => getCurrentWeekStart(schedulerTimeZone));

    const [loadedWeek, setLoadedWeek] = useState<{ weekStart: string; week?: SchedulerWeekResponse; error?: string; }>({ weekStart: "" });
    const apiWeek = loadedWeek.weekStart === selectedWeekStart ? loadedWeek.week : undefined;
    const serverWeek = apiWeek ? toCalendarWeek(apiWeek) : null;

    const weekLoading = loadedWeek.weekStart !== selectedWeekStart;
    const weekError = loadedWeek.weekStart === selectedWeekStart ? loadedWeek.error ?? null : null;

    const [projects, setProjects] = useState<BacklogProjectOption[]>([]);

    const [taskForm, setTaskForm] = useState<{ mode: "create" | "edit"; task?: Task; projectId?: string; } | null>(null);
    const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(() => new Set());
    const [splitTask, setSplitTask] = useState<Task | null>(null);
    const [deadlineTask, setDeadlineTask] = useState<Task | null>(null);
    const [createEntryRequested, setCreateEntryRequested] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const weekStart = selectedWeekStart;

        getSchedulerWeek(weekStart, controller.signal).then((loaded) => {
            setLoadedWeek({ weekStart, week: loaded });
        }).catch((error: unknown) => {
            if (controller.signal.aborted) return;

            setLoadedWeek({
                weekStart,
                error: error instanceof Error ? error.message : "Could not load week."
            });
        });
        return () => controller.abort();
    }, [selectedWeekStart]);

    useEffect(() => {
        let cancelled = false;

        getAssignedProjects().then((assigned) => {
            if (cancelled) return;

            setProjects(assigned.filter((item) => item.placementStatus === "ACTIVE")
                .map((item) => ({
                    id: item.project.id,
                    label: item.project.projectName,
                    clientName: item.project.clientName,
                    color: getProjectColour(item.project.id).color,
                    allocation: item.placementAllocation
                })));
        })
            .catch(() => {
                if (!cancelled) {
                    toast("Could not load assigned projects");
                }
            });

        return () => { cancelled = true; };

    }, [])

    const weekIssues = serverWeek ? [...serverWeek.metadata.alerts, ...serverWeek.metadata.warnings] : [];


    async function handleSuggestion(s: SchedulerSuggestion) {
        const action = s.action;
        switch (s.code) {
            case "PLACE_UNPLACED":
                if (action?.taskIds) await commitPlacement((v) => placeUnplacedTasks(action.taskIds!, v));
                break;
            case "PULL_FORWARD":
                if (action?.taskIds) await commitPlacement((v) => pullForwardTasks(selectedWeekStart, action.taskIds!, v));
                break;
            case "EXTEND_BLOCK":
                if (action?.blockId && action.to) {
                    await commitPlacement((v) => resizeBlock({ blockId: action.blockId!, to: action.to!, confirmedOverride: false, expectedVersion: v }));
                }
                break;
            case "REVIEW_CAPACITY":
                break; 
        }
    }



    
    const schedulerIssues = weekIssues.filter((i) => i.code !== ReasonCode.UNDERUTILISED);

    
    const dismissedCodesThisWeek = new Set(
        [...dismissedAlertKeys]
            .filter((k) => k.startsWith(`${selectedWeekStart}:`))
            .map((k) => k.slice(selectedWeekStart.length + 1)),
    );

    // Refetch whenever the week changes (any commit bumps the version)
    const suggestionsKey = apiWeek ? `${apiWeek.weekStart}:${apiWeek.version}` : "";
    const [suggestions, setSuggestions] = useState<{ key: string; list: SchedulerSuggestion[] }>({ key: "", list: [] });

    useEffect(() => {
        if (!suggestionsKey) return;
        const controller = new AbortController();
        getSchedulerSuggestions(selectedWeekStart, controller.signal)
            .then((list) => setSuggestions({ key: suggestionsKey, list }))
            .catch(() => { /* suggestions are optional; the page works without them */ });
        return () => controller.abort();
    }, [suggestionsKey, selectedWeekStart]);

    const currentSuggestions = suggestions.key === suggestionsKey
        ? suggestions.list.filter((s) => !dismissedCodesThisWeek.has(s.code))
        : [];
    

    const showUnderused = currentSuggestions.length > 0 && !dismissedCodesThisWeek.has(ReasonCode.UNDERUTILISED);

    const notificationCount =
        schedulerIssues.filter((i) => !dismissedCodesThisWeek.has(i.code)).length + (showUnderused ? 1 : 0);

    const serverSubtaskProgressByTaskId = Object.fromEntries(
        (serverWeek?.tasks ?? []).map((task) => [
            task.id,
            {
                completed: task.subtasks.filter((subtask) => subtask.done).length,
                total: task.subtasks.length,
            },
        ]),
    );

    function OpenCreateTask(projectId?: string) {
        setTaskForm({ mode: "create", projectId });
    }

    function openEditTask(task: Task) {
        setTaskForm({ mode: "edit", task, projectId: task.projectId });
    }

    // Hide straight away, save to the backend, and undo if the save fails
    function dismissAlert(code: string) {
        const key = `${selectedWeekStart}:${code}`;
        setDismissedAlertKeys((current) => new Set(current).add(key));

        dismissSchedulerIssue(selectedWeekStart, code).catch(() => {
            setDismissedAlertKeys((current) => {
                const next = new Set(current);
                next.delete(key);
                return next;
            });
            toast.error("Couldn't dismiss this alert. Please try again.");
        });
    }

    function handleAlertAction(issue: Issue, action: AlertActionKind) {
        const task = serverWeek?.tasks.find((t) => t.id === issue.entityIds?.[0]);

        switch (action) {
            case "openBacklog":
            case "resolveContainer":
                setActiveTab("tasks"); // the backlog lives on the Tasks tab
                break;
            case "openDeadlineDialog":
                if (task) setDeadlineTask(task);
                break;
            case "openSplitDialog":
                if (task) setSplitTask(task);
                break;
            case "viewSuggestions":
            case "dismiss":
                break; // the card is already on this tab; dismiss is the X button
        }
    }

    async function handleTaskSubmit(submission: TaskSubmission) {
        if (!apiWeek) {
            throw new Error("The selected week is still loading.");
        }

        let result;

        if (submission.mode === "create") {
            result = await createSchedulerTask(selectedWeekStart, submission.dto);
        } else {
            result = await updateSchedulerTask(submission.taskId, submission.dto);
        }

        if (!result.ok) {
            throw new Error(result.violations.map((issue) => issue.message).join(" "));
        }

        setLoadedWeek({ weekStart: selectedWeekStart, week: result.value });
        setTaskForm(null);

        // Find the saved task: for a new task, it's the id that wasn't in the week before
        const previousIds = new Set(apiWeek.tasks.map((task) => task.id));
        const savedTask = submission.mode === "create"
            ? result.value.tasks.find((task) => !previousIds.has(task.id))
            : result.value.tasks.find((task) => task.id === submission.taskId);

        // Other tasks that were placed before but got bumped to make room
        const previouslyUnplaced = new Set(
            apiWeek.tasks.filter((task) => task.placement === "unplaced").map((task) => task.id),
        );
        const bumpedTasks = result.value.tasks.filter((task) =>
            task.id !== savedTask?.id && task.placement === "unplaced" && !previouslyUnplaced.has(task.id),
        );

        const savedTaskUnplaced = savedTask?.placement === "unplaced";
        if (!savedTaskUnplaced && bumpedTasks.length === 0) return;

        setActiveTab("tasks");

        if (savedTaskUnplaced && savedTask) {
            const reason = savedTask.unplacedReason as ReasonCode | undefined;
            toast.warning(`"${savedTask.title}" couldn't be scheduled`, {
                description: `${(reason && REASON_MESSAGE[reason]) ?? "There's no room for it this week."} You'll find it in the Backlog (task tab).`,
                duration: 10_000,
                closeButton: true,
            });
        }

        if (bumpedTasks.length > 0) {
            toast.warning(
                bumpedTasks.length === 1
                    ? `"${bumpedTasks[0].title}" was moved to the Backlog (task tab) to make room.`
                    : `${bumpedTasks.length} tasks were moved to the Backlog (task tab) to make room.`,
            );
        }
    }


    async function handleSetStatus(taskId: string, dto: SetTaskStatusDto) {
        await commitPlacement((v) => setSchedulerTaskStatus(taskId, { ...dto, expectedVersion: v }));
    }


    async function handleDeleteTask(taskId: string) {
        await commitPlacement((v) => deleteSchedulerTask(taskId, v));
    }

    async function handleConfirmSplit(taskId: string, dto: SplitTaskDto) {
        if (await commitPlacement((v) => splitSchedulerTask(taskId, dto.atMinutes, v))) {
            setSplitTask(null);
        }
    }

    async function handleScheduleTask(taskId: string) {
        await commitPlacement((v) => placeUnplacedTasks([taskId], v));
    }

    async function commitPlacement(
        request: (expectedVersion: number) => Promise<SchedulerCommitResult>,
    ): Promise<boolean> {
        if (!apiWeek) return false;

        try {
            const result = await request(apiWeek.version);

            if (!result.ok) {
                // The backend sends the current week back with a conflict, so catch up straight away
                if (result.violations.some((v) => v.code === "VERSION_CONFLICT")) {
                    setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });
                    toast.warning("This week changed elsewhere. It's been refreshed, so please try again.");
                    return false;
                }
                toast.error(result.violations.map((issue) => issue.message).join(" "));
                return false;
            }

            setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });

            const previouslyUnplaced = new Set(
                apiWeek.tasks.filter((task) => task.placement === "unplaced").map((task) => task.id),
            );
            const newlyUnplaced = result.value.tasks.filter(
                (task) => task.placement === "unplaced" && !previouslyUnplaced.has(task.id),
            );
            if (newlyUnplaced.length > 0 && activeTab !== "tasks") {
                toast.warning(
                    newlyUnplaced.length === 1
                        ? `"${newlyUnplaced[0].title}" no longer fits and was moved to the Backlog.`
                        : `${newlyUnplaced.length} tasks no longer fit and were moved to the Backlog.`,
                    { duration: 10_000, action: { label: "View tasks", onClick: () => setActiveTab("tasks") } },
                );
            }


            const actionWarnings = [...result.warnings, ...result.infos].filter((i) => !NOTIFICATION_CODES.has(i.code));
            if (actionWarnings.length > 0) {
                toast.warning(actionWarnings.map((issue) => issue.message).join(" "));
            }
            return true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save the change.");
            return false;
        }
    }

    const handleMoveBlock = (blockId: string, to: Interval, confirmedOverride: boolean) =>
        commitPlacement((v) => moveBlock({ blockId, to, confirmedOverride, expectedVersion: v }));

    const handleResizeBlock = (blockId: string, to: Interval, confirmedOverride: boolean) =>
        commitPlacement((v) => resizeBlock({ blockId, to, confirmedOverride, expectedVersion: v }));

    const handlePinBlock = (blockId: string, pinned: boolean) =>
        commitPlacement((v) => pinBlock({ blockId, pinned, expectedVersion: v }));

    const handleMoveSlot = (slotId: string, to: Interval, confirmedOverride: boolean) =>
        commitPlacement((v) => moveSlot({ slotId, to, confirmedOverride, expectedVersion: v }));

    const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
        await commitPlacement((v) => toggleSchedulerSubtask(taskId, subtaskId, v));
    };

    const handleDeferToNextWeek = async (taskId: string) => {
        await commitPlacement((v) => deferTasksToNextWeek([taskId], v));
    };

    const handleAcceptDeadlineMiss = async (taskId: string) => {
        await commitPlacement((v) => acceptDeadlineMiss(taskId, v));
    };

    async function handleSaveEntry(dto: CalendarEntryDto) {
        const ok = await commitPlacement((v) => {
            const body = { ...dto, expectedVersion: v };
            return dto.id
                ? updateCalendarEntry(selectedWeekStart, dto.id, body)
                : createCalendarEntry(selectedWeekStart, body);
        });
        if (ok) setCreateEntryRequested(false);
        return ok;
    }

    const handleDeleteEntry = (entryId: string) =>
        commitPlacement((v) => deleteCalendarEntry(entryId, v));

    function openCreateEntry() {
        setActiveTab("calendar");
        setCreateEntryRequested(true);
    }

    return (
        <div className="flex h-dvh overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} notificationCount={unreadCount}/>

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <header className=" flex-none border-b border-slate-200 bg-white sm:px-2 lg:px-6 ">
                    <SchedulerHeader
                        weekStart={selectedWeekStart}
                        week={serverWeek}
                        projects={projects.map(({ id, label, clientName, allocation }) => ({
                            id, name: label, clientName, allocation: allocation ?? 0
                        }))}
                        onPrevWeek={() => setSelectedWeekStart((w) => shiftWeek(w, -1))}
                        onNextWeek={() => setSelectedWeekStart((w) => shiftWeek(w, 1))}
                    />
                </header>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <nav className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
                        <div className="flex">
                            {([["calendar", "Calendar"], ["tasks", "Tasks"], ["notifications", "Notifications"]] as const).map(([key, label]) => (
                                <button key={key} type="button" role="tab"
                                    aria-selected={activeTab === key}
                                    onClick={() => setActiveTab(key)}
                                    className={`border-b-2 px-3 py-3 text-sm font-medium ${activeTab === key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                                >
                                    {label}
                                    {key === "notifications" && notificationCount > 0 && (
                                        <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                            {notificationCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="my-2 flex items-center gap-2">
                            <button type="button"
                                onClick={openCreateEntry}
                                className="rounded-md border border-primary px-2.5 sm:px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
                            >
                                + Event
                            </button>
                            <button type="button"
                                onClick={() => OpenCreateTask()}
                                className="rounded-md bg-primary px-2.5 sm:px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/80"
                            >
                                + New Task
                            </button>
                        </div>
                    </nav>

                    <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
                        {activeTab == "calendar" && (
                            <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
                                {weekLoading && <p className="p-4">Loading week…</p>}

                                {!weekLoading && weekError && (
                                    <p role="alert" className="p-4 text-red-700">{weekError}</p>
                                )}

                                {!weekLoading && !weekError && serverWeek && (
                                    <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
                                        <WeekCalendar
                                            key={`${serverWeek.id}:${serverWeek.version}`}
                                            weekData={serverWeek}
                                            projects={projects}
                                            onMoveBlock={handleMoveBlock}
                                            onResizeBlock={handleResizeBlock}
                                            onPinBlock={handlePinBlock}
                                            onMoveSlot={handleMoveSlot}
                                            onSetStatus={handleSetStatus}
                                            createEntryRequested={createEntryRequested}
                                            onCreateEntryDone={() => setCreateEntryRequested(false)}
                                            onSaveEntry={handleSaveEntry}
                                            onDeleteEntry={handleDeleteEntry}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "tasks" && (
                            <SchedulerTaskTab
                                loading={weekLoading}
                                error={weekError}
                                week={serverWeek}
                                progress={serverSubtaskProgressByTaskId}
                                projects={projects}
                                onEdit={openEditTask}
                                onSetStatus={handleSetStatus}
                                onToggleSubtask={handleToggleSubtask}
                                onSchedule={handleScheduleTask}
                                onDelete={handleDeleteTask}
                                onSplit={setSplitTask}
                                onDeferToNextWeek={handleDeferToNextWeek}
                                onAcceptDeadlineMiss={handleAcceptDeadlineMiss}
                            />
                        )}

                                             {activeTab == "notifications" && (
                            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6">
                                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                                    <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                                    {showUnderused && serverWeek && (
                                        <UnderutilisationCard
                                            issue={{ level: "info", code: ReasonCode.UNDERUTILISED, message: "You have spare capacity this week." }}
                                            metadata={serverWeek.metadata}
                                            weekStart={serverWeek.weekStart}
                                            suggestions={currentSuggestions}
                                            onSuggestion={handleSuggestion}
                                            onDismissSuggestion={dismissAlert}
                                            onDismiss={() => currentSuggestions.forEach((s) => dismissAlert(s.code))}
                                        />
                                    )}

                                    <SchedulerAlertBanner
                                        issues={schedulerIssues}
                                        dismissedKeys={dismissedCodesThisWeek}
                                        onDismiss={dismissAlert}
                                        onAction={handleAlertAction}
                                    />

                                    {!showUnderused && schedulerIssues.every((i) => dismissedCodesThisWeek.has(i.code)) && (
                                        <p className="text-sm text-slate-500">Nothing needs your attention this week.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>


                    {taskForm && (
                        <TaskForm
                            open
                            mode={taskForm.mode}
                            initialTask={taskForm.task}
                            initialProjectId={taskForm.projectId}
                            projects={projects}
                            expectedVersion={apiWeek?.version ?? 0}
                            dependencyOptions={(serverWeek?.tasks ?? []).filter((task) => task.id !== taskForm.task?.id)
                                .map((task) => ({
                                    id: task.id,
                                    title: task.title,
                                }))}
                            onCancel={() => setTaskForm(null)}
                            onSubmit={handleTaskSubmit}
                        />
                    )}

                    {splitTask && apiWeek && (
                        <SplitTaskDialog
                            task={splitTask}
                            expectedVersion={apiWeek.version}
                            onCancel={() => setSplitTask(null)}
                            onConfirm={handleConfirmSplit}
                        />
                    )}

                    {deadlineTask && apiWeek && (
                        <DeadlineResolutionDialog
                            task={deadlineTask}
                            summary={{
                                reason: deadlineTask.unplacedReason ?? "DEADLINE_INFEASIBLE",
                                neededMinutes: deadlineTask.unplacedNeededMinutes ?? deadlineTask.tMax,
                                availableMinutes: deadlineTask.unplacedAvailableMinutes ?? 0,
                                deadline: deadlineTask.deadline,
                            } as UnplacedTaskSummary}
                            expectedVersion={apiWeek.version}
                            onCancel={() => setDeadlineTask(null)}
                            onExtendDeadline={async (id, dto) => {
                                if (await commitPlacement((v) => updateSchedulerTask(id, { ...dto, expectedVersion: v }))) setDeadlineTask(null);
                            }}
                            onReduceEstimate={async (id, dto) => {
                                if (await commitPlacement((v) => updateSchedulerTask(id, { ...dto, expectedVersion: v }))) setDeadlineTask(null);
                            }}
                            onAcceptMiss={async (id) => {
                                if (await commitPlacement((v) => acceptDeadlineMiss(id, v))) setDeadlineTask(null);
                            }}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}