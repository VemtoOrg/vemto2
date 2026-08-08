import Project from "@Common/models/Project"
import GenerateMenu from "./services/menu/GenerateMenu"
import GenerateRoutes from "./services/routes/GenerateRoutes"
import GenerateTranslations from "./services/translations/GenerateTranslations"
import GenerateCrudFiles from "./services/crud/GenerateCrudFiles"
import GenerateModelFiles from "./services/model/GenerateModelFiles"
import GeneratePageFiles from "./services/page/GeneratePageFiles"
import GenerateUiComponentsFiles from "./services/blade/ui/GenerateUiComponentsFiles"
import SchemaBuilder from "@Renderer/services/schema/SchemaBuilder"
import Main from "@Renderer/services/wrappers/Main"
import GenerateDatabaseSeeder from "./services/database/GenerateDatabaseSeeder"
import GenerateFilamentResources from "./services/crud/GenerateFilamentResources"
import Renderable from "./services/foundation/Renderable"
import PackageChecker from "./services/PackageChecker"
import RenderableFile from "@Common/models/RenderableFile"
import GenerateLivewireLayout from "./services/crud/GenerateLivewireLayout"
import GenerateCrudApiFiles from "./services/crud/GenerateCrudApiFiles"
import GenerateNovaResources from "./services/crud/GenerateNovaResources"
import AddRoutesToServiceProvider from "./services/routes/AddRoutesToServiceProvider"
import BlueprintSchemaUpdater from "@Renderer/services/schema/BlueprintSchemaUpdater"
import GenerateReactFiles from "@Renderer/codegen/sequential/services/crud/GenerateReactFiles"

export default class SequentialGenerator {
    static startTime: number = 0
    static elapsedTime: number = 0

    project: Project
    static running: boolean = false

    packageChecker: PackageChecker

    constructor(project: Project) {
        this.project = project

        this.packageChecker = new PackageChecker(project)
    }

    static isRunning(): boolean {
        return SequentialGenerator.running
    }

    async run(): Promise<void> {
        try {
            await this.runGeneration()
        } catch (error) {
            console.error("Error while running generation: ", error)

            throw error
        }
    }

    async runGeneration(): Promise<boolean> {
        if (SequentialGenerator.running) {
            throw new Error("Generation is already running")
        }

        SequentialGenerator.running = true

        SequentialGenerator.startTimer()

        SchemaBuilder.disableSchemaChangesCheck()

        await this.clearVemtoFolders()

        this.project.setFilesQueueStatusProcessing()
        this.project.clearCurrentRenderedFilesPaths()
        this.project.clearRemovedRenderableFiles()

        this.project.clearSkippedRenderableFiles()

        await this.calculateSkippedFilesByMissingDependencies()

        await this.runGeneratorsServices()

        await this.processRemovableFiles()

        await this.waitForProcessingFilesQueue()

        await this.readSchema()

        SchemaBuilder.enableSchemaChangesCheck()

        SequentialGenerator.stopTimer()

        SequentialGenerator.running = false

        return true
    }

    async calculateSkippedFilesByMissingDependencies() {
        let templatePaths = []

        const composerMissingDependencies = this.packageChecker.getComposerMissingDependencies()
        const packagesMissingDependencies = this.packageChecker.getPackagesMissingDependencies()

        composerMissingDependencies.forEach((dependency) => {
            templatePaths.push(...dependency.templatePaths)
        })

        packagesMissingDependencies.forEach((dependency) => {
            templatePaths.push(...dependency.templatePaths)
        })

        templatePaths = [...new Set(templatePaths)]

        templatePaths.forEach((path: string) => {
            const renderableFile: RenderableFile = this.project.fresh().getRenderableFileByTemplatePath(path)
            if (!renderableFile) return
            renderableFile.setAsSkipped()
        })
    }

    hasMissingDependencies(): boolean {
        return this.packageChecker.hasMissingDependencies()
    }

    async checkDependencies(): Promise<void> {
        Renderable.setMode("checker")

        await this.runGeneratorsServices()

        await this.packageChecker.checkForMissingDependencies()

        Renderable.setMode("generate")
    }

    /**
     * IMPORTANT: all services that write files using renderables can be directly called here.
     * If a service writes a file directly using API.writeFile or similar, it should be called inside
     * the generateNotRenderedFiles method. It is necessary to avoid writing files when running
     * in the checker mode.
     */
    async runGeneratorsServices() {
        // Generating rendered files
        await new GenerateModelFiles().start()
        await new GenerateDatabaseSeeder().start()

        /**
         * The following services generate files that are specific to certain project types.
         * They should only be executed if the project is of the appropriate type.
         * For example, UI components, menus, routes, CRUD files, Filament and Nova resources,
         * page files, and Livewire layouts are only relevant for Breeze, Jetstream, or API Starter Kit projects.
         */
        if (!this.project.isReactApp()) {
            // Generating not rendered files
            await this.generateNotRenderedFiles()
            await new GenerateUiComponentsFiles().start(this.project)
            await new GenerateMenu().start(this.project)
            await new GenerateRoutes().start(this.project)
            await new GenerateCrudFiles().start()
            await new GenerateCrudApiFiles().start(this.project)
            await new GenerateFilamentResources().start()
            await new GenerateNovaResources().start()
            await new GeneratePageFiles().start()
            await new GenerateLivewireLayout().start(this.project)
        }

        /**
         * React files generation
         * This service generates React files and should only be executed if the project
         * is identified as a React application.
         */
        if (this.project.isReactApp()) {
            await new GenerateReactFiles().start()
        }
    }

    /**
     * IMPORTANT: this method should be used to generate files that are not rendered using renderables.
     * It is necessary to avoid writing files when running in the checker mode. NEVER move the services from
     * this method to the runGeneratorsServices method. It can cause the generation to write files when
     * running in the checker mode, making Vemto react to changes that are not supposed to be written, as the
     * checker mode should only check for missing dependencies and not write any files.
     */
    async generateNotRenderedFiles() {
        if (Renderable.isCheckerMode()) {
            console.log("Skipping not rendered files generation because it is running in checker mode")
            return
        }

        console.log("Generating not rendered files")

        await new GenerateTranslations().start()
        await new AddRoutesToServiceProvider().start(this.project)
    }

    async processRemovableFiles() {
        await this.project.fresh().processRemovableFiles()
    }

    async clearVemtoFolders() {
        await Main.API.clearProjectFolder(".vemto/conflicts")
        await Main.API.clearProjectFolder(".vemto/processed-files")
    }

    async waitForProcessingFilesQueue() {
        while (this.project.fresh().processingFilesQueue()) {
            await new Promise((resolve) => setTimeout(resolve, 500))
        }
    }

    async readSchema() {
        // If blueprint mode is enabled, just update the models with the new changes,
        // without rebuilding the them from the application's source code.
        if (this.project.isBlueprintModeEnabled()) {
            const blueprintSchemaUpdater = new BlueprintSchemaUpdater(this.project)
            await blueprintSchemaUpdater.updateModels()

            return
        }

        this.project.ignoreNextSchemaSourceChanges()

        const schemaBuilder = new SchemaBuilder(this.project)

        await schemaBuilder.buildModels()
    }

    static startTimer(): void {
        this.startTime = Date.now()
    }

    static stopTimer(): void {
        this.elapsedTime = Date.now() - this.startTime
    }

    static getElapsedTimeInSeconds(): number {
        return this.elapsedTime / 1000
    }

    static getElapsedTime(): number {
        return this.elapsedTime
    }
}
