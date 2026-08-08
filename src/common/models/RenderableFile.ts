import PathUtil from "@Common/util/PathUtil"
import Project from "./Project"
import RelaDB from "@tiago_silva_pereira/reladb"

export enum RenderableFileType {
    HTML = "html",
    PHP = "php",
    BLADE = "blade",
    JS = "js",
    TSX = "tsx",
    TS = "ts",
    CSS = "css",
    SCSS = "scss",
    JSON = "json",
    ENV = "env",
    TXT = "txt",
}

export enum RenderableFileFormatter {
    NONE = "none",
    PHP = "php",
    HTML = "html",
    BLADE = "blade",
    TSX = "tsx",
    TS = "ts",
    JAVASCRIPT = "javascript",
}

export enum RenderableFileStatus {
    IDLE = "idle",
    PREPARING = "preparing",
    PENDING = "pending",
    RENDERING = "rendering",
    RENDERED = "rendered",
    ERROR = "error",
    CONFLICT = "conflict",
    ASK_TO_REMOVE = "to-be-removed",
    CAN_REMOVE = "can-remove",
    REMOVED = "removed",
    IGNORED = "ignored",
    SKIPPED = "skipped",
}

export default class RenderableFile extends RelaDB.Model {
    id: string
    path: string
    name: string
    fullPath: string
    template: string
    status: RenderableFileStatus
    project: Project
    projectId: string
    error: string
    errorStack: string
    hasTemplateError: boolean
    templateErrorLine: number
    type: RenderableFileType
    formatter: string
    conflictFileName: string
    content: string
    notRemovable: boolean
    ignoreConflicts: boolean

    relationships() {
        return {
            project: () => this.belongsTo(Project),
        }
    }

    isIdle(): boolean {
        return this.status === RenderableFileStatus.IDLE
    }

    isPending(): boolean {
        return this.status === RenderableFileStatus.PENDING
    }

    isRemovable(): boolean {
        return !this.notRemovable
    }

    canBeRemoved(): boolean {
        return this.status === RenderableFileStatus.CAN_REMOVE
    }

    setContent(content: string) {
        if (this.status === RenderableFileStatus.IDLE) return
        if (this.status === RenderableFileStatus.PENDING) return

        this.content = content

        this.status = RenderableFileStatus.PENDING

        this.save()

        return this
    }

    setError(error: string, stack: string = null) {
        this.error = error
        this.errorStack = stack.toString()

        this.status = RenderableFileStatus.ERROR

        this.save()

        return this
    }

    getRelativeFilePath(): string {
        return PathUtil.join(this.path, this.name)
    }

    setAsNotRemovable() {
        this.notRemovable = true

        this.save()
    }

    setAsRemovable() {
        this.notRemovable = false

        this.save()
    }

    askToRemove() {
        this.status = RenderableFileStatus.ASK_TO_REMOVE

        this.save()
    }

    markToRemove() {
        this.status = RenderableFileStatus.CAN_REMOVE

        this.save()
    }

    wasRemoved() {
        return this.status === RenderableFileStatus.REMOVED
    }

    hasConflict() {
        return this.status === RenderableFileStatus.CONFLICT
    }

    wasSkipped() {
        return this.status === RenderableFileStatus.SKIPPED
    }

    solveConflicts() {
        this.status = RenderableFileStatus.RENDERED
        this.conflictFileName = null

        this.save()
    }

    setAsIdle() {
        this.status = RenderableFileStatus.IDLE

        this.save()
    }

    setAsPending() {
        this.status = RenderableFileStatus.PENDING

        this.save()
    }

    setAsIgnored() {
        this.status = RenderableFileStatus.IGNORED

        this.save()
    }

    wasIgnored() {
        return this.status === RenderableFileStatus.IGNORED
    }

    setAsSkipped() {
        this.status = RenderableFileStatus.SKIPPED

        this.save()
    }
}
