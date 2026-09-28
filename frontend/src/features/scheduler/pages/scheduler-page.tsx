import { useState } from "react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import UnderutilisationCard, {type ActionSuggestion} from "../components/underutilisation-card";
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
import BacklogPanel, { type BacklogProjectOption } from "../components/backlog-panel";
import BlockDetailPanel from "../components/block-detail-panel";    
import TaskForm, { type TaskSubmission} from "../components/task-form";
import type { Task } from "../types/scheduler.types";
import SchedulerAlertBanner from "../components/scheduler-alert-banner";
import SchedulerHeader from "../components/scheduler-header/scheduler-header";

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

export default function SchedulerPage() {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [weekIndex, setWeekIndex] = useState(0);
    const week = FIXTURE_WEEKS[weekIndex];

    const underused = [...week.metadata.alerts, ...week.metadata.warnings].find(
        (i) => i.code === ReasonCode.UNDERUTILISED,
    );

    const dismissKey = `${week.id}:${ReasonCode.UNDERUTILISED}`;
    const showUnderused = underused && !dismissed.includes(dismissKey);

    function handleSuggestion(s:ActionSuggestion){
        switch (s.code){
            case "PLACE_UNPLACED":
            //
            case "PULL_FORWARD":
                //
            case "EXTEND_BLOCK":
                //
                break;
        }
    }


    const [backlogCollapsed, setBacklogCollapsed] = useState(false);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => designWeek.blocks[0]?.id ?? null );
    const [taskForm, setTaskForm] = useState<{mode: "create" | "edit"; task?: Task; projectId?: string;} | null>(null);
    const selectedBlock = designWeek.blocks.find((block) => block.id === selectedBlockId);
    const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(() => new Set());

    const blockTasks = selectedBlock ? designWeek.tasks.filter((task) => task.slots.some((slot) => slot.blockId === selectedBlock.id)) : [];
    const schedulerIssues = [ ...designWeek.metadata.alerts, ...designWeek.metadata.warnings ];

    function selectNextBlock() {
        if(designWeek.blocks.length === 0) return;

        const currentIndex = designWeek.blocks.findIndex((block) => block.id === selectedBlockId);
        const nextIndex = (currentIndex + 1) % designWeek.blocks.length;

        setSelectedBlockId(designWeek.blocks[nextIndex].id); 
    }

    function OpenCreateTask(projectId?: string){
        setTaskForm({mode: "create", projectId});
    }

    function openEditTask(task: Task) {
        setTaskForm({mode: "edit", task, projectId: task.projectId});
    }

    function dismissAlert(key: string) {
        setDismissedAlertKeys((current) =>{
            const next = new Set(current);
            next.add(key);
            return next;
        });
    }

    function handleAlertAction(){
        console.log("Handle alert actins"); // still to be implemented
    }

    async function handleTaskSubmit(submission: TaskSubmission) {
        if(submission.mode === "create"){
            console.log("Create task", submission.dto);
        } else{
            console.log("Update task", submission.taskId, submission.dto);
        }
        setTaskForm(null);
    }

    const [creatingEntry, setCreatingEntry] = useState(false);


    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} />

            <div className="flex-1 flex flex-col min-w-0">
                <header className=" flex-none border-b border-slate-200 bg-white px-6 ">
                    <SchedulerHeader
                        week={week}
                        projects={FIXTURE_PROJECTS}
                        onPrevWeek={weekIndex > 0 ? () => setWeekIndex((i) => i - 1) : undefined}
                        onNextWeek={weekIndex < FIXTURE_WEEKS.length - 1 ? () => setWeekIndex((i) => i + 1) : undefined}
                        onAddEvent={() => setCreatingEntry(true)}
                    />
                </header>

                {/* Three vertical sections */}
                <div className="flex-1 flex min-h-0 overflow-hidden">

                    {/* Backlog panel */}
                    <BacklogPanel 
                        tasks={designWeek.tasks.filter((task) => task.placement === "unplaced")}
                        unplacedSummaries={designWeek.metadata.unplaced}
                        projects={projects}
                        now={Date.parse(FIXTURE_NOW)}
                        expectedVersion={designWeek.version}
                        collapsed={backlogCollapsed}
                        onToggleCollapse={() => setBacklogCollapsed((collapsed) => !collapsed)}
                        onAddTask={() => OpenCreateTask()}
                        onSchedule={() => {}}
                        onResolveDeadline={() => {}}
                        onDeferToNextWeek={() => {}}
                        onDismiss={() => {}}
                    />

                    {/*Week calendar*/}
                    <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                        <div className="flex-1 overflow-auto p-4">
                            <WeekCalendar
                                key={week.id}
                                weekData={week}
                                createEntryRequested={creatingEntry}
                                onCreateEntryDone={() => setCreatingEntry(false)}
                            />
                        </div>
                        {showUnderused && (
                            <div className="flex-none">
                                <UnderutilisationCard
                                    issue={underused}
                                    metadata={week.metadata}
                                    weekStart={week.weekStart}
                                    onSuggestion={handleSuggestion}
                                    onDismiss={() => setDismissed((d) => [...d, dismissKey])}
                                />

                            </div>
                        )}


                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 p-4">
                            <div className="pointer-events-auto z-9 text-white p-3 rounded-lg shadow-lg">
                                <SchedulerAlertBanner 
                                    issues={schedulerIssues}
                                    dismissedKeys={dismissedAlertKeys}
                                    onDismiss={dismissAlert}
                                    onAction={handleAlertAction}
                                />
                            </div>
                        </div>
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
                    )

                    }

                    {/* BlockDetail panel */}
                    <BlockDetailPanel 
                        block={selectedBlock}
                        projectLabel={projects.find((project) => project.id === selectedBlock?.projectId)?.label ?? "Select a project block"}
                        clientName={projects.find((project) => project.id === selectedBlock?.projectId)?.clientName ?? "" }
                        tasks={blockTasks}
                        now={Date.parse(FIXTURE_NOW)}
                        expectedVersion={designWeek.version}
                        onExpand={() => setSelectedBlockId(designWeek.blocks[0]?.id ?? null)}
                        onClose={() => setSelectedBlockId(null)}
                        onNextBlock={selectNextBlock}
                        onAddTask={() => OpenCreateTask(selectedBlock?.projectId)}
                        onAutoRollover={() => {}}
                        onEditTask={openEditTask}
                        onSetStatus={() => {}}
                        onToggleSubtask={() => {}}
                        onSendToBacklog={() => {}}
                        onDeleteTask={() => {}}
                        onSplitTask={() => {}}
                    />

                </div>

            </div>


        </div>
    );
}