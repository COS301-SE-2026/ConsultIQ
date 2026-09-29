import { useState } from "react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import UnderutilisationCard, { type ActionSuggestion } from "../components/underutilisation-card";
import { ReasonCode } from "../types/scheduler.types";
import {
    FIXTURE_PROJECTS,
    designWeek,
    holidayWeek,
    FIXTURE_NOW,
    leaveWeek,
    batchWeek,
    emptyWeek,
    underusedWeek

} from "../types/scheduler.fixtures";
import { type BacklogProjectOption } from "../components/backlog-panel";
import TaskForm, { type TaskSubmission } from "../components/task-form";
import type { Task } from "../types/scheduler.types";
import SchedulerAlertBanner from "../components/scheduler-alert-banner";
import SchedulerHeader from "../components/scheduler-header/scheduler-header";
import TaskBoard from "../components/task-board";

const FIXTURE_WEEKS = [designWeek, holidayWeek, leaveWeek, batchWeek, emptyWeek, underusedWeek];

const projectColors = ["#2563eb", "#059669", "#d97706"];

const projects: BacklogProjectOption[] = FIXTURE_PROJECTS.map(
    (project, index) => ({
        id: project.id,
        label: project.name,
        clientName: project.clientName,
        color: projectColors[index % projectColors.length]
    }),
);

type SchedulerTab = "calendar" | "tasks" | "notifications";

export default function SchedulerPage() {
    const [activeTab, setActiveTab] = useState<SchedulerTab>("calendar");

    const [dismissed, setDismissed] = useState<string[]>([]);
    const [weekIndex, setWeekIndex] = useState(0);
    const week = FIXTURE_WEEKS[weekIndex];

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


   // const [backlogCollapsed, setBacklogCollapsed] = useState(false);
    //const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => designWeek.blocks[0]?.id ?? null);
    const [taskForm, setTaskForm] = useState<{ mode: "create" | "edit"; task?: Task; projectId?: string; } | null>(null);
    //const selectedBlock = designWeek.blocks.find((block) => block.id === selectedBlockId);
    const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(() => new Set());

   // const blockTasks = selectedBlock ? designWeek.tasks.filter((task) => task.slots.some((slot) => slot.blockId === selectedBlock.id)) : [];
    const schedulerIssues = [...designWeek.metadata.alerts, ...designWeek.metadata.warnings];

    const fixtureSubtaskProgressByTaskId = Object.fromEntries(
        week.tasks.map((task) => [
            task.id,
            {
            completed: task.subtasks.filter((subtask) => subtask.done).length,
            total: task.subtasks.length,
            },
        ]),
        );
    // function selectNextBlock() {
    //     if (designWeek.blocks.length === 0) return;

    //     const currentIndex = designWeek.blocks.findIndex((block) => block.id === selectedBlockId);
    //     const nextIndex = (currentIndex + 1) % designWeek.blocks.length;

    //     setSelectedBlockId(designWeek.blocks[nextIndex].id);
    // }

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
        if (submission.mode === "create") {
            console.log("Create task", submission.dto);
        } else {
            console.log("Update task", submission.taskId, submission.dto);
        }
        setTaskForm(null);
    }

    const [creatingEntry, setCreatingEntry] = useState(false);


    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} />

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <header className=" flex-none border-b border-slate-200 bg-white px-6 ">
                    <SchedulerHeader
                        week={week}
                        projects={FIXTURE_PROJECTS}
                        onPrevWeek={weekIndex > 0 ? () => setWeekIndex((i) => i - 1) : undefined}
                        onNextWeek={weekIndex < FIXTURE_WEEKS.length - 1 ? () => setWeekIndex((i) => i + 1) : undefined}
                    />
                </header>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <nav className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
                        <div className="flex">
                           {([["calendar", "Calendar"], ["tasks", "Tasks"], ["notifications", "Notifications"]] as const).map(([key, label]) => (
                            <button key={key} type="button" role="tab"
                                aria-selected={activeTab === key}
                                onClick={() => setActiveTab(key)}
                                className = {`border-b-2 px-3 py-3 text-sm font-medium ${activeTab === key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                            >
                                {label}
                            </button>
                           ))} 
                        </div>

                        <div className="my-2 flex items-center gap-2">
                            <button type="button"
                                onClick={() => setCreatingEntry(true)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                + Event
                            </button>   

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
                                <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
                                    <WeekCalendar
                                        key={week.id}
                                        weekData={week}
                                        createEntryRequested={creatingEntry}
                                        onCreateEntryDone={() => setCreatingEntry(false)}
                                    />
                                </div>
                            </div>    
                            )}

                        {activeTab === "tasks" && (
                            <div className="h-full min-h-0 min-w-0 overflow-hidden">
                                <TaskBoard
                                tasks={week.tasks}
                                projects={projects}
                                now={Date.parse(FIXTURE_NOW)}
                                expectedVersion={week.version}
                                subtaskProgressByTaskId={fixtureSubtaskProgressByTaskId}
                                onEditTask={openEditTask}
                                onSetStatus={() => {}}
                                onToggleSubtask={() => {}}
                                onSendToBacklog={() => {}}
                                onDelete={() => {}}
                                onSplit={() => {}}
                                />
                            </div>
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
                            expectedVersion={designWeek.version}
                            dependencyOptions={designWeek.tasks.filter((task) => task.id !== taskForm.task?.id)
                                .map((task) => ({
                                    id: task.id,
                                    title: task.title,
                                }))}
                            onCancel={() => setTaskForm(null)}
                            onSubmit={handleTaskSubmit}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}