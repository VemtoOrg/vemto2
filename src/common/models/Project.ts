import Nav from "./Nav"
import Route from "./Route"
import Table from "./Table"
import Model from "./Model"
import Crud from "./crud/Crud"
import Page from "./page/Page"
import { v4 as uuid } from "uuid"
import Relationship from "./Relationship"
import RelaDB from "@tiago_silva_pereira/reladb"
import { compareVersions } from "compare-versions"
import RenderableFile, {
    RenderableFileStatus,
    RenderableFileType,
} from "./RenderableFile"
import AppSection from "./AppSection"
import CalculateSchemaTablesChanges from "./services/project/CalculateSchemaTablesChanges"
import Column from "./Column"
import Index from "./Index"
import ProjectPathResolver from "@Common/services/ProjectPathResolver"
import CalculateSchemaModelsChanges from "./services/project/CalculateSchemaModelsChanges"
import SchemaSection from "./SchemaSection"

export enum TranslationsFormat {
    LANG = "lang",
    UNDERSCORE = "underscore",
}
interface ProjectCodeGenerationSettings {
    models: boolean,
    factories: boolean,
    seeders: boolean,
    policies: boolean,
    requests: boolean,
    controllers: boolean,
    routes: boolean,
    views: boolean,
    uiComponents: boolean,
    livewireLayout: boolean,
    translationsOnViews: boolean,
    translationsFormat: TranslationsFormat,
}

interface ScheduledSchemaCheck {
    tables: boolean
    models: boolean
}

export enum ProjectFilesQueueStatus {
    IDLE = "idle",
    PROCESSING = "processing",
}

export enum ProjectCssFramework {
    TAILWIND = "tailwind",
    BOOTSTRAP = "bootstrap",
    BULMA = "bulma",
    FOUNDATION = "foundation",
    OTHER = "other",
}

export enum ProjectUIStarterKit {
    REACT = "react",
    JETSTREAM = "jetstream",
    BREEZE = "breeze",
    LARAVEL_UI = "laravel_ui",
    EMPTY = "empty",
    API = "api",
    OTHER = "other",
}

export interface ProjectSettings {
    cssFramework: ProjectCssFramework
    uiStarterKit: ProjectUIStarterKit,
    usesLivewire: boolean
    usesInertia: boolean
    usesVue: boolean
    usesReact: boolean
    usesSvelte: boolean
    isFreshLaravelProject: boolean,
    laravelVersion: string
    blueprintModeEnabled: boolean
    schemaReaderMode: string
    schemaReaderDbDriver: string
    schemaReaderDbHost: string
    schemaReaderDbPort: string
    schemaReaderDbDatabase: string
    schemaReaderDbUsername: string
    schemaReaderDbPassword: string
}

export default class Project extends RelaDB.Model {
    id: string
    uuid: string
    name: string
    navs: Nav[]
    cruds: Crud[]
    pages: Page[]
    tables: Table[]
    columns: Column[]
    indexes: Index[]
    models: Model[]
    routes: Route[]
    ownRelationships: Relationship[]
    appSections: AppSection[]
    schemaSections: SchemaSection[]
    schemaDataHash: string
    lastReadSchemaDataHash: string
    schemaTablesDataHash: string
    schemaModelsDataHash: string
    hasSchemaSourceChanges: boolean
    canIgnoreNextSchemaSourceChanges: boolean
    canShowSchemaSourceChangesAlert: boolean
    scheduledSchemaSync: ScheduledSchemaCheck
    renderableFiles: RenderableFile[]
    currentRenderedFilesPaths: string[]
    vthemeCdn: string
    vthemeKeys: any
    currentSchemaError: string
    currentSchemaErrorStack: string
    scrollX: number
    scrollY: number
    codeGenerationSettings: ProjectCodeGenerationSettings
    settings: ProjectSettings
    filesQueueStatus: ProjectFilesQueueStatus
    currentZoom: number
    connectionFinished: boolean
    translations: any
    defaultLanguage: string
    languages: string[]
    codeChangesDetectorDisabled: boolean

    relationships() {
        return {
            navs: () => this.hasMany(Nav).cascadeDelete(),
            cruds: () => this.hasMany(Crud).cascadeDelete(),
            pages: () => this.hasMany(Page).cascadeDelete(),
            tables: () => this.hasMany(Table).cascadeDelete(),
            columns: () => this.belongsToMany(Column, Table),
            indexes: () => this.belongsToMany(Index, Table),
            models: () => this.hasMany(Model).cascadeDelete(),
            routes: () => this.hasMany(Route).cascadeDelete(),
            appSections: () => this.hasMany(AppSection).cascadeDelete(),
            schemaSections: () => this.hasMany(SchemaSection).cascadeDelete(),
            ownRelationships: () => this.hasMany(Relationship).cascadeDelete(),
            renderableFiles: () => this.hasMany(RenderableFile).cascadeDelete(),
        }
    }

    static creating(data: any) {
        data = Project.addUuidIfNotExists(data)
        return data
    }

    static addUuidIfNotExists(data: any) {
        if (!data.uuid) data.uuid = uuid()
        return data
    }

    startCodeGenerationSettings() {
        this.fixCodeGenerationSettings()

        if (this.codeGenerationSettings) return

        this.codeGenerationSettings = this.getDefaultCodeGenerationSettings()

        this.save()
    }

    fixCodeGenerationSettings() {
        if (!this.codeGenerationSettings) return

        const defaultCodeGenerationSettings = this.getDefaultCodeGenerationSettings()

        Object.keys(defaultCodeGenerationSettings).forEach((key) => {
            if (typeof this.codeGenerationSettings[key] === "undefined") {
                this.codeGenerationSettings[key] = defaultCodeGenerationSettings[key]
            }
        })

        this.save()
    }

    getDefaultCodeGenerationSettings(): ProjectCodeGenerationSettings {
        return {
            models: true,
            factories: true,
            seeders: true,
            policies: true,
            requests: true,
            controllers: true,
            routes: true,
            views: this.starterKitNeedsViewsAndUiComponents(),
            uiComponents: this.starterKitNeedsViewsAndUiComponents(),
            livewireLayout: (this.isBreeze() || this.isJetstream()) && this.settings.usesLivewire,
            translationsOnViews: true,
            translationsFormat: TranslationsFormat.UNDERSCORE,
        }
    }


    static findOrCreate(): Project {
        let project = Project.find(1)

        if (project === null) {
            project = new Project()
            project.save()
        }

        return project
    }

    isEmpty(): boolean {
        return this.id === undefined
    }

    setPath(path: string) {
        ProjectPathResolver.setPath(path)
    }

    getPath(): string {
        return ProjectPathResolver.getPath()
    }

    getNonDetailApplications(): any[] {
        const cruds = this.cruds.filter((crud) => !crud.isDetail())

        return [...cruds, ...this.pages]
    }

    getApplications(): any[] {
        return [...this.cruds, ...this.pages]
    }

    getApplicationById(applicationId: string): any {
        return this.getApplications().find((application) => application.id === applicationId)
    }

    getAuthModel(): Model {
        return this.models.find((model) => model.isAuthModel())
    }

    deleteAllApplications() {
        this.cruds.forEach((crud) => crud.delete())
        this.pages.forEach((page) => page.delete())
    }

    hasTable(tableName: string): boolean {
        return (
            this.tables.find((table) => table.name === tableName) !== undefined
        )
    }

    doesNotHaveTable(tableName: string): boolean {
        return !this.hasTable(tableName)
    }

    findTableByName(tableName: string): Table {
        return this.tables.find((table) => table.name === tableName)
    }

    findTableBySchemaStateName(schemaStateName: string): Table {
        return this.tables.find(
            (table) => table.schemaState.name === schemaStateName
        )
    }

    findTableById(tableId: string): Table {
        return this.tables.find((table) => table.id == tableId)
    }

    findModelByName(modelName: string): Model {
        return this.models.find((model) => model.name === modelName)
    }

    findModelByClass(modelClass: string): Model {
        return this.models.find((model) => model.class === modelClass)
    }

    findModelById(modelId: string): Model {
        return this.models.find((model) => model.id == modelId)
    }

    getTablesWithChangesIncludingRemoved(): Table[] {
        return this.tables.filter((table) => {
            return table.isDirty() || table.isRemoved()
        })
    }

    getTablesWithChanges(): Table[] {
        return this.tables.filter((table) => table.isDirty())
    }

    getTablesNames(): string[] {
        return this.tables.map((table) => table.name)
    }

    getAllTablesKeyedByName(): { [key: string]: Table } {
        let tables: { [key: string]: Table } = {}

        this.tables.forEach((table) => {
            tables[table.name] = table
        })

        return tables
    }

    getModelsNames(): string[] {
        return this.getValidModels().map((model) => model.name)
    }

    getModelsPlurals(): string[] {
        return this.getValidModels().map((model) => model.plural)
    }

    getAllModelsKeyedByName(): { [key: string]: Model } {
        let models: { [key: string]: Model } = {}

        this.models.forEach((model) => {
            if(!model.name) return
            
            models[model.name] = model
        })

        return models
    }

    getModelsClasses(): string[] {
        return this.models.map((model) => model.class)
    }

    getValidModels(): Model[] {
        return this.models.filter((model) => model.isValid())
    }

    getAllModelsKeyedByClass(): { [key: string]: Model } {
        let models: { [key: string]: Model } = {}

        this.models.forEach((model) => {
            models[model.class] = model
        })

        return models
    }

    deleteAllModelsWithoutTable() {
        this.models.forEach((model) => {
            if (model.hasNoTable()) model.delete()
        })
    }

    scheduleSchemaTablesSync() {
        this.scheduleSchemaSync(true, false)
    }

    scheduleSchemaModelsSync() {
        this.scheduleSchemaSync(false, true)
    }

    scheduleSchemaSync(tables: boolean = false, models: boolean = false) {
        this.scheduledSchemaSync = {
            tables,
            models,
        }

        this.save()
    }

    hasScheduledSchemaSync(): boolean {
        if (!this.scheduledSchemaSync) return false

        return this.scheduledSchemaSync.tables || this.scheduledSchemaSync.models
    }
    
    resetScheduledSchemaSync() {
        this.scheduledSchemaSync = null
        this.save()
    }

    ignoreNextSchemaSourceChanges() {
        this.canIgnoreNextSchemaSourceChanges = true
        this.save()
    }

    dontIgnoreNextSchemaSourceChanges() {
        this.canIgnoreNextSchemaSourceChanges = false
        this.save()
    }

    setHasSchemaSourceChanges(hasChanges: boolean) {
        this.hasSchemaSourceChanges = hasChanges
        this.save()
    }

    hasSchemaChanges(): boolean {
        return this.hasSchemaTablesChanges() || this.hasSchemaModelsChanges()
    }

    hasSchemaTablesChanges(): boolean {
        const tablesChangesCalculator = new CalculateSchemaTablesChanges(this)

        return tablesChangesCalculator.hasChanges()
    }

    hasSchemaModelsChanges(): boolean {
        const modelsChangesCalculator = new CalculateSchemaModelsChanges(this)

        return modelsChangesCalculator.hasChanges()
    }

    getChangedTables(): Table[] {
        if (!this.hasSchemaTablesChanges()) return []

        return new CalculateSchemaTablesChanges(this).getAllTables()
    }

    getChangedModels(): Model[] {
        if (!this.hasSchemaModelsChanges()) return []

        return new CalculateSchemaModelsChanges(this).getAllModels()
    }

    getRenamedTables(): Table[] {
        return this.getTables().filter((table) => table.wasRenamed())
    }

    getRemovedTables(): Table[] {
        return this.tables.filter((table) => table.isRemoved())
    }

    getNewTables(): Table[] {
        return this.getTables().filter((table) => table.isNew())
    }

    getTables(): Table[] {
        return this.tables.filter((table) => !table.isRemoved())
    }

    getRoutesByRoutableType(type: string): Route[] {
        return this.routes.filter((route) => route.routableType === type)
    }

    getApplicationsBySection(section: AppSection): any[] {
        return this.getApplications().filter(
            (application) => application.sectionId === section.id
        )
    }

    getAllPendingRenderableFiles(): RenderableFile[] {
        return this.renderableFiles.filter(
            (renderableFile) => renderableFile.isPending() || renderableFile.canBeRemoved()
        )
    }

    getAllRenderableFiles(ordered: boolean = true): RenderableFile[] {
        return ordered ? this.getOrderedRenderableFiles() : this.renderableFiles
    }

    getNonRemovedRenderableFiles(ordered: boolean = true): RenderableFile[] {
        const renderableFiles = ordered ? this.getOrderedRenderableFiles() : this.renderableFiles

        return renderableFiles.filter(
            (renderableFile) => !renderableFile.wasRemoved()
        )
    }

    getRemovedRenderableFiles(ordered: boolean = true): RenderableFile[] {
        const renderableFiles = ordered ? this.getOrderedRenderableFiles() : this.renderableFiles

        return renderableFiles.filter((renderableFile) =>
            renderableFile.wasRemoved()
        )
    }

    getIgnoredRenderableFiles(ordered: boolean = true): RenderableFile[] {
        const renderableFiles = ordered ? this.getOrderedRenderableFiles() : this.renderableFiles

        return renderableFiles.filter(
            (renderableFile) => renderableFile.wasIgnored()
        )
    }

    getConflictRenderableFiles(ordered: boolean = true): RenderableFile[] {
        const renderableFiles = ordered ? this.getOrderedRenderableFiles() : this.renderableFiles

        return renderableFiles.filter(
            (renderableFile) => renderableFile.hasConflict()
        )
    }

    getSkippedRenderableFiles(ordered: boolean = true): RenderableFile[] {
        const renderableFiles = ordered ? this.getOrderedRenderableFiles() : this.renderableFiles

        return renderableFiles.filter(
            (renderableFile) => renderableFile.wasSkipped()
        )
    }

    getOrderedRenderableFiles(): RenderableFile[] {
        return this.renderableFiles.sort((a, b) => {
            if (a.status === RenderableFileStatus.ERROR) return -1
            if (b.status === RenderableFileStatus.ERROR) return 1

            if (a.status === RenderableFileStatus.CONFLICT) return -1
            if (b.status === RenderableFileStatus.CONFLICT) return 1

            if (a.status === RenderableFileStatus.SKIPPED) return -1
            if (b.status === RenderableFileStatus.SKIPPED) return 1

            if (a.status === RenderableFileStatus.RENDERED) return -1
            if (b.status === RenderableFileStatus.RENDERED) return 1

            if (a.path < b.path) return -1
            if (a.path > b.path) return 1

            return 0
        })
    }

    clearRemovedFiles() {
        this.getRemovedRenderableFiles().forEach((renderableFile) =>
            renderableFile.delete()
        )
    }

    registerRenderableFile(
        path: string,
        name: string,
        template: string,
        type: RenderableFileType = RenderableFileType.PHP,
        status: RenderableFileStatus = RenderableFileStatus.PREPARING,
        ignoreConflicts: boolean = false
    ) : RenderableFile {
        let renderableFile: RenderableFile = null

        const fullPath = `${path}/${name}`

        this.registerCurrentRenderedFilePath(fullPath)

        renderableFile = this.renderableFiles.find(
            (renderableFile) =>
                renderableFile.path === path &&
                renderableFile.name === name &&
                renderableFile.template === template
        )

        if (!renderableFile) {
            renderableFile = new RenderableFile()
        }

        if (renderableFile.wasIgnored() || renderableFile.wasSkipped()) {
            return renderableFile
        }

        renderableFile.path = path
        renderableFile.name = name
        renderableFile.fullPath = fullPath
        renderableFile.template = template
        renderableFile.projectId = this.id
        renderableFile.type = type
        renderableFile.status = status
        renderableFile.ignoreConflicts = ignoreConflicts

        renderableFile.save()

        return renderableFile
    }

    hasRenderableFilesWithErrors(): boolean {
        return this.renderableFiles.some(
            (renderableFile) => renderableFile.status === RenderableFileStatus.ERROR
        )
    }

    hasRenderableFilesWithConflict(): boolean {
        return this.renderableFiles.some(
            (renderableFile) => renderableFile.status === RenderableFileStatus.CONFLICT
        )
    }

    clearRemovedRenderableFiles() {
        this.getRemovedRenderableFiles(false).forEach((renderableFile: RenderableFile) =>
            renderableFile.delete()
        )
    }

    clearSkippedRenderableFiles() {
        this.getSkippedRenderableFiles(false).forEach((renderableFile: RenderableFile) =>
            renderableFile.setAsIdle()
        )
    }

    clearCurrentRenderedFilesPaths() {
        this.currentRenderedFilesPaths = []
        this.save()
    }

    registerCurrentRenderedFilePath(path: string) {
        if (!this.currentRenderedFilesPaths) this.currentRenderedFilesPaths = []

        this.currentRenderedFilesPaths.push(path)
        this.save()
    }

    getCurrentRenderedFilesPaths(): string[] {
        return this.currentRenderedFilesPaths
    }

    processRemovableFiles() {
        const removableFiles = this.getRemovableFiles()

        removableFiles.forEach((file) => {
            file.markToRemove()
        })
    }

    getRemovableFiles(): RenderableFile[] {
        let removableFiles: RenderableFile[] = []

        const latestRenderedFiles = this.renderableFiles.filter(file => file.isRemovable())

        if (!latestRenderedFiles) return removableFiles

        latestRenderedFiles.forEach((file) => {
            if (!this.currentRenderedFilesPaths.includes(file.fullPath)) {
                removableFiles.push(file)
            }
        })

        return removableFiles
    }

    getRootNavs(): Nav[] {
        return this.navs.filter(nav => nav.isRoot())
    }

    getVthemeCdn(): string {
        return this.vthemeCdn || null
    }

    setVthemeCdn(vthemeCdn: string) {
        this.vthemeCdn = vthemeCdn
        this.save()
    }

    getVthemeKeys(): { [key: string]: string } {
        return this.vthemeKeys || {}
    }

    getVthemeKey(keyName): string {
        if (!this.vthemeKeys) return null
        return this.vthemeKeys[keyName] || null
    }

    hasVthemeKey(keyName): boolean {
        if (!this.vthemeKeys) return false
        return typeof this.vthemeKeys[keyName] !== 'undefined'
    }

    setVthemeKey(keyName, value) {
        if (!this.vthemeKeys) this.vthemeKeys = {}
        this.vthemeKeys[keyName] = value
        this.save()
    }

    saveVthemeKeys(vthemeKeys: any) {
        this.vthemeKeys = vthemeKeys
        this.save()
    }

    hasCurrentSchemaError(): boolean {
        return !!this.currentSchemaError
    }

    setCurrentSchemaError(error: string, stack:string = null) {
        const currentErrorIsTheSame = this.currentSchemaError === error,
            currentStackIsTheSame = this.currentSchemaErrorStack === this.treatErrorStack(stack)

        if (currentErrorIsTheSame && currentStackIsTheSame) return

        this.currentSchemaError = error
        this.currentSchemaErrorStack = this.treatErrorStack(stack)
        this.save()
    }

    // split the stack into an array of lines and remove all lines that have the string ".phar"
    treatErrorStack(stack: string): string {
        if (!stack) return null

        stack = stack.replace(/VEMTO_EOL/g, "\n")

        const lines = stack.split("\n").map(line => { 
            line = line.replace('schema-reader Error: ', '')
            line = line.trim() 

            return line
        })

        return lines.filter(line => !line.includes(".phar")).join("\n")
    }

    clearCurrentSchemaError() {
        if (!this.hasCurrentSchemaError()) return
        
        this.currentSchemaError = null
        this.currentSchemaErrorStack = null
        this.save()
    }

    hasScroll(): boolean {
        return !! this.scrollX && !! this.scrollY
    }

    centerScroll(canvasWidth, canvasHeight, baseSize: number = 50000) {
        this.scrollX = (baseSize / 2) - (canvasWidth / 2)
        this.scrollY = (baseSize / 2) - (canvasHeight / 2)
        this.save()
    }

    saveScroll(x: number, y: number) {
        this.scrollX = x
        this.scrollY = y
        this.save()
    }

    undoAllTablesChanges() {
        this.tables.forEach((table) => table.undoAllChanges())
    }

    undoAllModelsChanges() {
        this.models.forEach((model) => model.undoAllChanges())
    }

    processingFilesQueue(): boolean {
        return this.filesQueueStatus === ProjectFilesQueueStatus.PROCESSING
    }

    setFilesQueueStatusProcessing() {
        this.filesQueueStatus = ProjectFilesQueueStatus.PROCESSING
        this.save()
    }

    setFilesQueueStatusIdle() {
        this.filesQueueStatus = ProjectFilesQueueStatus.IDLE
        this.save()
    }

    setFilesQueueStatus(status: ProjectFilesQueueStatus) {
        this.filesQueueStatus = status
        this.save()
    }

    zoomIn() {
        this.initZoom()
        if (this.currentZoom >= 200) return
        this.currentZoom += 10
        this.save()
    }

    zoomOut() {
        this.initZoom()
        if (this.currentZoom <= 10) return
        this.currentZoom -= 10
        this.save()
    }

    initZoom() {
        if (this.currentZoom) return
        this.currentZoom = 100
        this.save()
    }

    getZoomAsScale(): number {
        const currentZoom = this.currentZoom || 100

        return currentZoom / 100
    }

    getTabNameFor(key: string) {
        return `${this.uuid}-${key}`
    }

    getDefaultTranslation(key: string): string {
        return this.getTranslation(this.defaultLanguage, key) || ""
    }

    getTranslation(language: string, key: string): string {
        if (!this.translations) return null
        if (!this.translations[language]) return null
        if (!this.translations[language][key]) return null

        return this.translations[language][key]
    }

    setTranslation(language: string, key: string, value: string) {
        if (!this.translations) this.translations = {}
        
        if (!this.translations[language]) this.translations[language] = {}

        this.translations[language][key] = value

        this.save()
    }

    setTranslationOnAllLanguages(key: string, value: string) {
        if (!this.languages) {
            this.languages = ["en"]
        }

        this.languages.forEach(language => {
            this.setTranslation(language, key, value)
        })
    }

    deleteTranslation(language: string, key: string) {
        if(!this.translations) return
        if(!this.translations[language]) return
        if(!this.translations[language][key]) return

        delete this.translations[language][key]

        this.save()
    }

    deleteTranslationOnAllLanguages(key: string) {
        if(!this.languages) return
        
        this.languages.forEach(language => {
            this.deleteTranslation(language, key)
        })
    }

    static defaultSchemaSection(): SchemaSection {
        const project = Project.find(1)

        return project.getDefaultSchemaSection()
    }
    
    getDefaultSchemaSection(): SchemaSection {
        const defaultSchemaSection = this.schemaSections.find(section => section.isDefault())

        if (defaultSchemaSection) return defaultSchemaSection

        return this.schemaSections[0]
    }

    getSchemaSectionByName(sectionName: string): SchemaSection {
        return this.schemaSections.find(section => section.name === sectionName)
    }

    hasSection(sectionName: string): boolean {
        return this.schemaSections.some(section => section.name === sectionName)
    }

    moveTableToSectionByName(table: Table, sectionName: string) {
        const section = this.schemaSections.find(section => section.name === sectionName)

        if (!section) return

        this.moveTableToSection(table, section)
    }

    moveTableToDefaultSection(table: Table) {
        const defaultSection = this.getDefaultSchemaSection()

        this.moveTableToSection(table, defaultSection)
    }

    moveTableToSection(table: Table, section: SchemaSection) {
        table.sectionId = section.id
        table.save()
    }

    getTablesBySection(section: SchemaSection): Table[] {
        return this.tables.filter(table => table.sectionId === section.id)
    }
    
    laravelVersionEqualTo(version: string): boolean {
        return compareVersions(this.settings.laravelVersion, version) === 0
    }

    laravelVersionGreaterThan(version: string): boolean {
        return compareVersions(this.settings.laravelVersion, version) === 1
    }

    laravelVersionGreaterThanOrEqualTo(version: string): boolean {
        return compareVersions(this.settings.laravelVersion, version) >= 0
    }

    laravelVersionLessThan(version: string): boolean {
        return compareVersions(this.settings.laravelVersion, version) === -1
    }

    laravelVersionLessThanOrEqualTo(version: string): boolean {
        return compareVersions(this.settings.laravelVersion, version) <= 0
    }

    isReactApp(): boolean {
        return this.settings.uiStarterKit === ProjectUIStarterKit.REACT
    }

    isJetstream(): boolean {
        return this.settings.uiStarterKit === ProjectUIStarterKit.JETSTREAM
    }

    isBreeze(): boolean {
        return this.settings.uiStarterKit === ProjectUIStarterKit.BREEZE
    }

    isEmptyStarterKit(): boolean {
        return this.settings.uiStarterKit === ProjectUIStarterKit.EMPTY
    }

    isApiStarterKit(): boolean {
        return this.settings.uiStarterKit === ProjectUIStarterKit.API
    }

    isOtherStarterKit(): boolean {
        return this.settings.uiStarterKit === ProjectUIStarterKit.OTHER
    }

    starterKitDoesNotNeedViewsAndUiComponents(): boolean {
        return !this.starterKitNeedsViewsAndUiComponents()
    }

    starterKitNeedsViewsAndUiComponents(): boolean {
        return !this.isEmptyStarterKit() && !this.isApiStarterKit() && !this.isOtherStarterKit()
    }

    isFreshLaravelProject(): boolean {
        return this.settings.isFreshLaravelProject
    }

    getRenderableFileByTemplatePath(path: string) {
        return this.renderableFiles.find(file => file.template === path)
    }

    isSyncModeEnabled(): boolean {
        return !this.isBlueprintModeEnabled()
    }

    isBlueprintModeEnabled(): boolean {
        return !! this.settings?.blueprintModeEnabled
    }

    getLaravelVersion(): string {
        return this.settings?.laravelVersion
    }

    organizeTablesHorizontally(schemaSection: SchemaSection) {
        const tables = this.getTablesBySection(schemaSection)

        if (!tables || tables.length === 0) return

        const horizontalSpacing = 400

        const totalWidth = (tables.length - 1) * horizontalSpacing
        const startX = -totalWidth / 2

        tables.forEach((table, index) => {
            table.positionX = startX + (index * horizontalSpacing)
            table.positionY = 0
            table.save()
        })
    }

    organizeTablesOfAllSectionsByRelations() {
        this.schemaSections.forEach(section => this.organizeTablesByRelations(section))
    }

    organizeTablesByRelations(schemaSection: SchemaSection) {
        const tables = this.getTablesBySection(schemaSection)
        
        if (!tables || tables.length === 0) return
        
        // Count relations for each table
        const tableRelations = {}
        
        // Initialize counts
        tables.forEach(table => {
            tableRelations[table.id] = 0
        })
        
        // Count relations by analyzing both foreign keys and relationships
        tables.forEach(table => {
            // Count foreign indexes (when this table has foreign keys to other tables)
            table.getForeignIndexes().forEach(() => {
                tableRelations[table.id]++
            })
            
            // Count relationships defined in models linked to this table
            table.getRelationships().forEach(() => {
                tableRelations[table.id]++
            })
            
            // Count tables that have foreign keys to this table
            const childrenTables = table.getChildrenTables()
            childrenTables.forEach(() => {
                tableRelations[table.id]++
            })
        })
        
        // Sort tables by relation count (highest to lowest)
        const sortedTables = [...tables].sort((a, b) => 
            tableRelations[b.id] - tableRelations[a.id]
        )
        
        // Constants for positioning
        const SPACING_H = 700
        const SPACING_V = 700
        
        // Place center table (most relations)
        const centerTable = sortedTables[0]
        if (centerTable) {
            centerTable.positionX = 0
            centerTable.positionY = 0
            centerTable.save()
        }
        
        // Calculate positions for remaining tables in layers
        let currentLayer = 1
        let tablesPlaced = 1  // Center table already placed
        
        while (tablesPlaced < sortedTables.length) {
            // Each layer has 8 * currentLayer positions
            const positionsInLayer = 8 * currentLayer
            
            // Calculate positions in this layer
            for (let i = 0; i < positionsInLayer && tablesPlaced < sortedTables.length; i++) {
                const table = sortedTables[tablesPlaced]
                
                // Calculate angle in radians (divide circle into equal parts)
                const angle = (i / positionsInLayer) * 2 * Math.PI
                
                // Calculate coordinates based on layer and angle
                // Each layer is SPACING_H/V further from center
                const x = Math.round(Math.sin(angle) * SPACING_H * currentLayer)
                const y = Math.round(Math.cos(angle) * SPACING_V * currentLayer)
                
                // Position the table
                table.positionX = x
                table.positionY = y
                table.save()
                
                tablesPlaced++
            }
            
            // Move to next layer
            currentLayer++
        }
    }

}
