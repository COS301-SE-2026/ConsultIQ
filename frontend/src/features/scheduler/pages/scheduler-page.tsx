import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import UnderutilisationCard, { type ActionSuggestion } from "../components/underutilisation-card";
import {
    ReasonCode,
    type Task,
    type SchedulerWeekResponse,
    type WeekContainer,
    type SetTaskStatusDto,
    type ToggleSubtaskDto,
    type SchedulerCommitResult,
    type Interval,
    type SplitTaskDto
} from "../types/scheduler.types";
import {
    designWeek,
    holidayWeek,
    leaveWeek,
    batchWeek,
    emptyWeek,
    underusedWeek

} from "../types/scheduler.fixtures";
import { type BacklogProjectOption } from "../components/backlog-panel";
import TaskForm, { type TaskSubmission } from "../components/task-form";
import SchedulerAlertBanner from "../components/scheduler-alert-banner";
import SchedulerHeader from "../components/scheduler-header/scheduler-header";
import TaskBoard from "../components/task-board";
import SplitTaskDialog from "../components/split-task-dialog";
import {
    getSchedulerWeek, setSchedulerTaskStatus, toggleSchedulerSubtask, toCalendarWeek, createSchedulerTask,
    updateSchedulerTask, deleteSchedulerTask, splitSchedulerTask, placeUnplacedTasks,moveBlock, resizeBlock, pinBlock, moveSlot 
} from "../services/scheduler.service"
import { getAssignedProjects } from "../../consultants/services/consultant.service";
import { toast } from "sonner";
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
}

const FIXTURE_WEEKS = [designWeek, holidayWeek, leaveWeek, batchWeek, emptyWeek, underusedWeek];

const projectColors = ["#2563eb", "#059669", "#d97706"];


type SchedulerTab = "calendar" | "tasks" | "notifications";

function getCurrentWeekStart(timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());

    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);

    const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);

    return date.toISOString().slice(0, 10);
}

function SchedulerTaskTab({ loading, error, week, progress, projects, onEdit, onSetStatus, onToggleSubtask, onSchedule, onDelete, onSplit }: SchedulerTaskTabProps) {
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
                onSendToBacklog={() => { }}
                onDelete={onDelete}
                onSplit={onSplit}
            />
        </div>
    );
}

export default function SchedulerPage() {
    const [activeTab, setActiveTab] = useState<SchedulerTab>("calendar");

    const [dismissed, setDismissed] = useState<string[]>([]);

    const schedulerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentWeekStart = getCurrentWeekStart(schedulerTimeZone);
    const [weekIndex, setWeekIndex] = useState(() => {
        const index = FIXTURE_WEEKS.findIndex((fixture) => fixture.weekStart === currentWeekStart);
        return index >= 0 ? index : 0;
    });
    const week = FIXTURE_WEEKS[weekIndex];
    const selectedWeekStart = week.weekStart;

    const [loadedWeek, setLoadedWeek] = useState<{ weekStart: string; week?: SchedulerWeekResponse; error?: string; }>({ weekStart: "" });
    const apiWeek = loadedWeek.weekStart === selectedWeekStart ? loadedWeek.week : undefined;
    const serverWeek = apiWeek ? toCalendarWeek(apiWeek) : null;

    const weekLoading = loadedWeek.weekStart !== selectedWeekStart;
    const weekError = loadedWeek.weekStart === selectedWeekStart ? loadedWeek.error ?? null : null;

    const [projects, setProjects] = useState<BacklogProjectOption[]>([]);

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
                .map((item, index) => ({
                    id: item.project.id,
                    label: item.project.projectName,
                    clientName: item.project.clientName,
                    color: projectColors[index % projectColors.length],
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

    const underused = [...week.metadata.alerts, ...week.metadata.warnings].find(
        (i) => i.code === ReasonCode.UNDERUTILISED,
    );

    const dismissKey = `${week.id}:${ReasonCode.UNDERUTILISED}`;
    const showUnderused = underused && !dismissed.includes(dismissKey);

    function handleSuggestion(s: ActionSuggestion) {
        switch (s.code) {
            case "PLACE_UNPLACED":
                // placeUnplaced.mutate({ taskIds: s.payload.taskIds, expectedVersion: week.version })
                break;
            case "PULL_FORWARD":
                // pullForward.mutate({ taskIds: s.payload.taskIds, expectedVersion: week.version })
                break;
            case "EXTEND_BLOCK":
                // Resize
                break;
        }
    }

   
    const [taskForm, setTaskForm] = useState<{ mode: "create" | "edit"; task?: Task; projectId?: string; } | null>(null);
    const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(() => new Set());
    const [splitTask, setSplitTask] = useState<Task | null>(null);

    const schedulerIssues = [...designWeek.metadata.alerts, ...designWeek.metadata.warnings];

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

    function dismissAlert(key: string) {
        setDismissedAlertKeys((current) => {
            const next = new Set(current);
            next.add(key);
            return next;
        });
    }

    function handleAlertAction() {
        console.log("Handle alert actins"); // still to be implemented
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
    }

    async function handleSetStatus(taskId: string, dto: SetTaskStatusDto) {
        if (!apiWeek) return;

        try {
            const result = await setSchedulerTaskStatus(taskId, { ...dto, expectedVersion: apiWeek.version });

            if (!result.ok) {
                setLoadedWeek((current) => ({ ...current, error: result.violations.map((issue) => issue.message).join(" ") }));
                return;
            }

            setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });
        } catch (error) {
            setLoadedWeek((current) => ({ ...current, error: error instanceof Error ? error.message : "Could not update task status." }))
        }

    }

    async function handleDeleteTask(taskId: string) {
        if (!apiWeek) return;

        try {
            const result = await deleteSchedulerTask(taskId, apiWeek.version);

            if (!result.ok) {
                setLoadedWeek((current) => ({
                    ...current, error: result.violations.map((issue) => issue.message).join(" ")
                }));
                return;
            }

            setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });
        } catch (error) {
            setLoadedWeek((current) => ({
                ...current, error: error instanceof Error ? error.message : "Could not delete task."
            }))
        }
    }

    async function handleConfirmSplit(taskId: string, dto: SplitTaskDto) {
        if (!apiWeek) return;

        const result = await splitSchedulerTask(taskId, dto.atMinutes, apiWeek.version);

        if (!result.ok) {
            setLoadedWeek((current) => ({
                ...current, error: result.violations.map((issue) => issue.message).join(" ")
            }));
            return;
        }

        setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });
        setSplitTask(null);
    }

    async function handleScheduleTask(taskId: string) {
        if (!apiWeek) return;

        try {
            const result = await placeUnplacedTasks([taskId], apiWeek.version);
            console.log(
                result.value.tasks.find((task) => task.id === taskId),
            );
            if (!result.ok) {
                setLoadedWeek((current) => ({ ...current, error: result.violations.map((issue) => issue.message).join(" ") }));
                return;
            }

            setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });
        } catch (error) {
            setLoadedWeek((current) => ({ ...current, error: error instanceof Error ? error.message : "Could not schedule task." }));
        }
    }

    async function commitPlacement(
        request: (expectedVersion: number) => Promise<SchedulerCommitResult>,
    ): Promise<boolean> {
        if (!apiWeek) return false;

        try {
            const result = await request(apiWeek.version);

            if (!result.ok) {
                toast.error(result.violations.map((issue) => issue.message).join(" "));
                return false;
            }

            setLoadedWeek({ weekStart: apiWeek.weekStart, week: result.value });
            if (result.warnings.length > 0) {
                toast.warning(result.warnings.map((issue) => issue.message).join(" "));
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

    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} />

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <header className=" flex-none border-b border-slate-200 bg-white px-6 ">
                    <SchedulerHeader
                        weekStart={selectedWeekStart}
                        week={serverWeek}
                        projects={projects.map(({ id, label, clientName, allocation }) => ({
                            id, name: label, clientName, allocation: allocation ?? 0
                        }))}
                        onPrevWeek={weekIndex > 0 ? () => setWeekIndex((i) => i - 1) : undefined}
                        onNextWeek={weekIndex < FIXTURE_WEEKS.length - 1 ? () => setWeekIndex((i) => i + 1) : undefined}
                    />
                </header>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <nav className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
                        <div className="flex">
                            {([["calendar", "Calendar"], ["tasks", "Tasks"]] as const).map(([key, label]) => (
                                <button key={key} type="button" role="tab"
                                    aria-selected={activeTab === key}
                                    onClick={() => setActiveTab(key)}
                                    className={`border-b-2 px-3 py-3 text-sm font-medium ${activeTab === key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="my-2 flex items-center gap-2">
                            <button type="button"
                                onClick={() => OpenCreateTask()}
                                className="my-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/80"
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
                                            projects={projects.map(({ id, label, clientName, allocation }) => ({ id, name: label, clientName, allocation }))}
                                            onMoveBlock={handleMoveBlock}
                                            onResizeBlock={handleResizeBlock}
                                            onPinBlock={handlePinBlock}
                                            onMoveSlot={handleMoveSlot}
                                            onSetStatus={handleSetStatus}
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
                            />
                        )}

                        {activeTab == "notifications" && (
                            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-4 sm:p-6">
                                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                                    <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                                    {showUnderused && (
                                        <UnderutilisationCard
                                            issue={underused}
                                            metadata={week.metadata}
                                            weekStart={week.weekStart}
                                            onSuggestion={handleSuggestion}
                                            onDismiss={() => setDismissed((d) => [...d, dismissKey])}
                                        />
                                    )}

                                    <SchedulerAlertBanner
                                        issues={schedulerIssues}
                                        dismissedKeys={dismissedAlertKeys}
                                        onDismiss={dismissAlert}
                                        onAction={handleAlertAction}
                                    />
                                </div>
                            </main>
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

                </div>
            </div>
        </div>
    );
}